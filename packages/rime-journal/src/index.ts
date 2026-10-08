import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync
} from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";

import type {
  InputRecordEvent,
  RawInputRecord,
  TimeRange,
  TimeRangePreset,
  UserSettings,
  VocabularyInsight
} from "../../contracts/src/index";
import {
  analyzeVocabulary,
  buildPreviousRange,
  filterRecordsByResolvedRange,
  resolveRangeFromQuery,
  type ResolvedRange
} from "../../analytics/src/index";
import { createIngestionService } from "../../services/src/ingestion";

const DEFAULT_TIMEZONE = "Asia/Shanghai";
const DEFAULT_OFFSET = "+08:00";
const DAY_MS = 24 * 60 * 60 * 1000;

export interface RimeCommitJournalEntry {
  schemaVersion: "1.0";
  occurredAt: string;
  dateKey: string;
  source: "rime";
  schemaId: string;
  text: string;
  inputCode?: string;
  sessionId?: string;
  sequence?: number;
  processClock?: number;
  boundaryId?: string;
  focusId?: string;
  observed?: boolean;
  textLanguage: InputRecordEvent["textLanguage"];
  charCount: number;
}

export interface JournalReadError {
  filePath: string;
  lineNumber: number;
  message: string;
}

export interface ReadJournalOptions {
  root?: string;
  rawDir?: string;
  startDateKey?: string;
  endDateKey?: string;
  strict?: boolean;
}

export interface ReadJournalResult {
  rawDir: string;
  files: string[];
  entries: RimeCommitJournalEntry[];
  errors: JournalReadError[];
}

export interface JournalSelection {
  preset?: TimeRangePreset;
  date?: string;
  week?: string;
  startAt?: string;
  endAt?: string;
  nowIso?: string;
  timezone?: string;
  offset?: string;
}

export interface WordCloudReportInput extends ReadJournalOptions, JournalSelection {
  limit?: number;
  settings?: UserSettings;
}

export interface WordCloudPoint {
  term: string;
  count: number;
  share: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface WordCloudReport {
  generatedAt: string;
  range: ResolvedRange;
  previousRange: ResolvedRange;
  source: {
    rawDir: string;
    files: string[];
    entriesRead: number;
    parseErrors: JournalReadError[];
  };
  totals: {
    commits: number;
    characters: number;
    tokens: number;
  };
  wordCloud: WordCloudPoint[];
  newTerms: WordCloudPoint[];
  risingTerms: WordCloudPoint[];
  fallingTerms: WordCloudPoint[];
}

export interface EventsReportInput extends ReadJournalOptions, JournalSelection {
  limit?: number;
}

export interface EventsReport {
  generatedAt: string;
  range: ResolvedRange;
  source: {
    rawDir: string;
    files: string[];
    entriesRead: number;
    parseErrors: JournalReadError[];
  };
  entries: RimeCommitJournalEntry[];
}

export const defaultJournalRoot = (): string =>
  process.env.RIME_COMMIT_LOG_ROOT ??
  join(homedir(), ".local", "share", "personal-input-analytics");

export const resolveRawDir = (input: Pick<ReadJournalOptions, "root" | "rawDir"> = {}): string =>
  resolve(input.rawDir ?? join(input.root ?? defaultJournalRoot(), "raw"));

const defaultSettings: UserSettings = {
  recordingEnabled: true,
  paused: false,
  retention: {
    mode: "store-raw",
    retentionDays: 90,
    autoArchive: true,
    exportMaskingEnabled: true
  },
  filterRules: [
    {
      id: "rule-secret-like-text",
      type: "regex",
      pattern: "(token|password|secret|密码|私钥|api[_-]?key)",
      enabled: true,
      reason: "sensitive text"
    }
  ],
  stopWords: [
    "的",
    "了",
    "是",
    "我",
    "你",
    "他",
    "她",
    "它",
    "我们",
    "你们",
    "他们",
    "这个",
    "那个",
    "什么",
    "怎么",
    "可以",
    "需要"
  ],
  sessionGapSeconds: 600
};

const normalizeDateKey = (value: string): string | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? value
    : null;
};

const compareDateKey = (left: string, right: string): number => left.localeCompare(right);

const listJournalFiles = (rawDir: string, startDateKey?: string, endDateKey?: string): string[] => {
  if (!existsSync(rawDir)) {
    return [];
  }

  return readdirSync(rawDir)
    .filter((fileName) => fileName.endsWith(".jsonl"))
    .filter((fileName) => {
      const dateKey = fileName.slice(0, -".jsonl".length);
      if (!normalizeDateKey(dateKey)) {
        return false;
      }
      if (startDateKey && compareDateKey(dateKey, startDateKey) < 0) {
        return false;
      }
      if (endDateKey && compareDateKey(dateKey, endDateKey) > 0) {
        return false;
      }
      return true;
    })
    .map((fileName) => join(rawDir, fileName))
    .filter((filePath) => statSync(filePath).isFile())
    .sort();
};

const countCharacters = (text: string): number => [...text].length;

const detectLanguage = (text: string): InputRecordEvent["textLanguage"] => {
  const hasHan = /\p{Script=Han}/u.test(text);
  const hasLatin = /[A-Za-z]/.test(text);

  if (hasHan && hasLatin) {
    return "mixed";
  }
  if (hasHan) {
    return "zh-CN";
  }
  if (hasLatin) {
    return "en-US";
  }
  return "mixed";
};

const asJournalEntry = (value: unknown): RimeCommitJournalEntry => {
  if (!value || typeof value !== "object") {
    throw new Error("record is not an object");
  }

  const record = value as Record<string, unknown>;
  const text = record.text;
  const occurredAt = record.occurredAt;
  const dateKey = record.dateKey;

  if (typeof text !== "string" || text.length === 0) {
    throw new Error("record.text must be a non-empty string");
  }
  if (typeof occurredAt !== "string" || Number.isNaN(new Date(occurredAt).getTime())) {
    throw new Error("record.occurredAt must be a valid ISO datetime");
  }
  if (typeof dateKey !== "string" || !normalizeDateKey(dateKey)) {
    throw new Error("record.dateKey must be YYYY-MM-DD");
  }

  const schemaId =
    typeof record.schemaId === "string" && record.schemaId.length > 0
      ? record.schemaId
      : "unknown";
  const textLanguage =
    record.textLanguage === "zh-CN" ||
    record.textLanguage === "en-US" ||
    record.textLanguage === "mixed"
      ? record.textLanguage
      : detectLanguage(text);

  return {
    schemaVersion: "1.0",
    occurredAt,
    dateKey,
    source: "rime",
    schemaId,
    text,
    inputCode: typeof record.inputCode === "string" ? record.inputCode : undefined,
    sessionId: typeof record.sessionId === "string" ? record.sessionId : undefined,
    sequence: typeof record.sequence === "number" ? record.sequence : undefined,
    processClock: typeof record.processClock === "number" ? record.processClock : undefined,
    boundaryId: typeof record.boundaryId === "string" ? record.boundaryId : undefined,
    focusId: typeof record.focusId === "string" ? record.focusId : undefined,
    textLanguage,
    charCount:
      typeof record.charCount === "number" && Number.isFinite(record.charCount)
        ? record.charCount
        : countCharacters(text)
  };
};

export const readJournalEntries = (options: ReadJournalOptions = {}): ReadJournalResult => {
  const rawDir = resolveRawDir(options);
  const files = listJournalFiles(rawDir, options.startDateKey, options.endDateKey);
  const entries: RimeCommitJournalEntry[] = [];
  const errors: JournalReadError[] = [];

  for (const filePath of files) {
    const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }

      try {
        entries.push(asJournalEntry(JSON.parse(trimmed)));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({
          filePath,
          lineNumber: index + 1,
          message
        });
      }
    });
  }

  if (options.strict !== false && errors.length > 0) {
    const first = errors[0]!;
    throw new Error(`${first.filePath}:${first.lineNumber}: ${first.message}`);
  }

  entries.sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));

  return {
    rawDir,
    files,
    entries,
    errors
  };
};

const stableId = (entry: RimeCommitJournalEntry, index: number): string => {
  const hash = createHash("sha256")
    .update(entry.occurredAt)
    .update("\0")
    .update(entry.schemaId)
    .update("\0")
    .update(entry.inputCode ?? "")
    .update("\0")
    .update(entry.text)
    .digest("hex")
    .slice(0, 16);

  return `rime-${entry.dateKey}-${String(index + 1).padStart(4, "0")}-${hash}`;
};

export const toRawInputRecords = (entries: RimeCommitJournalEntry[]): RawInputRecord[] =>
  entries.map((entry, index) => ({
    id: stableId(entry, index),
    occurredAt: entry.occurredAt,
    appId: "rime.fcitx5",
    appName: `Rime ${entry.schemaId}`,
    text: entry.text,
    source: "rime",
    candidateIndex: null,
    tags: ["rime-commit", `schema:${entry.schemaId}`]
  }));

const pad = (value: number): string => String(value).padStart(2, "0");

const formatOffset = (offsetMinutes: number): string => {
  const sign = offsetMinutes < 0 ? "-" : "+";
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;

  return `${sign}${pad(hours)}:${pad(minutes)}`;
};

const localIsoNow = (): string => {
  const date = new Date();
  const offsetMinutes = -date.getTimezoneOffset();

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${formatOffset(offsetMinutes)}`;
};

const dateKeyFromUtcDate = (date: Date): string =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

const addDays = (dateKey: string, days: number): string => {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKeyFromUtcDate(date);
};

const toIsoBoundary = (
  dateKey: string,
  endOfDay: boolean,
  offset: string
): string => `${dateKey}T${endOfDay ? "23:59:59" : "00:00:00"}${offset}`;

const isoWeekStart = (week: string): string => {
  const match = week.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid ISO week: ${week}`);
  }

  const year = Number(match[1]);
  const weekNumber = Number(match[2]);
  if (weekNumber < 1 || weekNumber > 53) {
    throw new Error(`Invalid ISO week: ${week}`);
  }

  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  week1Monday.setUTCDate(week1Monday.getUTCDate() + (weekNumber - 1) * 7);

  return dateKeyFromUtcDate(week1Monday);
};

export const resolveJournalRange = (
  selection: JournalSelection = {}
): ResolvedRange => {
  const timezone = selection.timezone ?? DEFAULT_TIMEZONE;
  const offset = selection.offset ?? DEFAULT_OFFSET;
  const reference = selection.nowIso ?? localIsoNow();
  if (!Number.isFinite(Date.parse(reference))) {
    throw new Error(`Invalid reference time: ${reference}`);
  }
  // Presets and explicit dates must use the same reporting offset.
  const offsetSign = offset.startsWith("-") ? -1 : 1;
  const offsetMinutes = offsetSign * (Number(offset.slice(1, 3)) * 60 + Number(offset.slice(4, 6)));
  const nowIso = new Date(Date.parse(reference) + offsetMinutes * 60_000)
    .toISOString().slice(0, 19) + offset;
  const selectors = [selection.date, selection.week, selection.preset === "custom" ? undefined : selection.preset,
    selection.startAt || selection.endAt].filter(Boolean);
  if (selectors.length > 1) {
    throw new Error("Choose one of date, week, preset, or a custom start/end range");
  }

  if (selection.date) {
    const dateKey = normalizeDateKey(selection.date);
    if (!dateKey) {
      throw new Error(`Invalid date: ${selection.date}`);
    }

    return {
      preset: "custom",
      startAt: toIsoBoundary(dateKey, false, offset),
      endAt: toIsoBoundary(dateKey, true, offset),
      timezone,
      label: dateKey
    };
  }

  if (selection.week) {
    const startDateKey = isoWeekStart(selection.week);
    const endDateKey = addDays(startDateKey, 6);

    return {
      preset: "custom",
      startAt: toIsoBoundary(startDateKey, false, offset),
      endAt: toIsoBoundary(endDateKey, true, offset),
      timezone,
      label: selection.week
    };
  }

  if (selection.startAt || selection.endAt) {
    if (!selection.startAt || !selection.endAt) {
      throw new Error("Custom range requires both startAt and endAt");
    }
    if (!Number.isFinite(Date.parse(selection.startAt)) ||
        !Number.isFinite(Date.parse(selection.endAt)) ||
        Date.parse(selection.startAt) > Date.parse(selection.endAt)) {
      throw new Error("Custom range requires valid timestamps with startAt <= endAt");
    }

    return {
      preset: "custom",
      startAt: selection.startAt,
      endAt: selection.endAt,
      timezone,
      label: "custom"
    };
  }

  const preset = selection.preset ?? "today";
  if (preset === "custom") {
    throw new Error("Custom range requires both startAt and endAt");
  }
  const query: TimeRange = {
    preset,
    startAt: nowIso.endsWith("Z") ? undefined : nowIso,
    endAt: nowIso.endsWith("Z") ? undefined : nowIso,
    timezone,
    label: preset
  };

  return resolveRangeFromQuery(query, nowIso);
};

const rangeDateBounds = (range: ResolvedRange): { startDateKey: string; endDateKey: string } => ({
  startDateKey: range.startAt.slice(0, 10),
  endDateKey: range.endAt.slice(0, 10)
});

const toPoint = (insight: VocabularyInsight): WordCloudPoint => ({
  term: insight.term,
  count: insight.count,
  share: insight.share,
  firstSeenAt: insight.firstSeenAt,
  lastSeenAt: insight.lastSeenAt
});

const readForSelection = <T extends ReadJournalOptions & JournalSelection>(
  input: T,
  range: ResolvedRange
): ReadJournalResult => {
  const bounds = rangeDateBounds(range);

  return readJournalEntries({
    ...input,
    startDateKey: input.startDateKey ?? bounds.startDateKey,
    endDateKey: input.endDateKey ?? bounds.endDateKey,
    strict: input.strict ?? false
  });
};

const processEntries = (
  entries: RimeCommitJournalEntry[],
  timezone: string,
  settings: UserSettings
) =>
  createIngestionService().processRawRecords({
    records: toRawInputRecords(entries),
    timezone,
    settings
  });

export const buildWordCloudReport = (
  input: WordCloudReportInput = {}
): WordCloudReport => {
  const range = resolveJournalRange(input);
  const previousRange = buildPreviousRange(range);
  const currentBounds = rangeDateBounds(range);
  const previousBounds = rangeDateBounds(previousRange);
  const read = readJournalEntries({
    ...input,
    startDateKey: input.startDateKey ?? previousBounds.startDateKey,
    endDateKey: input.endDateKey ?? currentBounds.endDateKey,
    strict: input.strict ?? false
  });
  const settings = input.settings ?? defaultSettings;
  const processed = processEntries(read.entries, range.timezone, settings);

  const currentEvents = filterRecordsByResolvedRange(processed.events, range);
  const previousEvents = filterRecordsByResolvedRange(processed.events, previousRange);
  const vocabulary = analyzeVocabulary({
    currentEvents,
    previousEvents,
    stopWords: settings.stopWords
  });
  const limit = input.limit ?? 30;

  return {
    generatedAt: new Date().toISOString(),
    range,
    previousRange,
    source: {
      rawDir: read.rawDir,
      files: read.files,
      entriesRead: read.entries.length,
      parseErrors: read.errors
    },
    totals: {
      commits: currentEvents.length,
      characters: currentEvents.reduce((sum, event) => sum + event.charCount, 0),
      tokens: currentEvents.reduce((sum, event) => sum + event.tokenCount, 0)
    },
    wordCloud: vocabulary.topTerms.slice(0, limit).map(toPoint),
    newTerms: vocabulary.newTerms.slice(0, limit).map(toPoint),
    risingTerms: vocabulary.risingTerms.slice(0, limit).map(toPoint),
    fallingTerms: vocabulary.fallingTerms.slice(0, limit).map(toPoint)
  };
};

export const buildEventsReport = (input: EventsReportInput = {}): EventsReport => {
  const range = resolveJournalRange(input);
  const read = readForSelection(input, range);
  const start = new Date(range.startAt).getTime();
  const end = new Date(range.endAt).getTime();
  const limit = input.limit ?? 200;

  const entries = read.entries
    .filter((entry) => {
      const timestamp = new Date(entry.occurredAt).getTime();
      return timestamp >= start && timestamp <= end;
    })
    .slice(0, limit);

  return {
    generatedAt: new Date().toISOString(),
    range,
    source: {
      rawDir: read.rawDir,
      files: read.files,
      entriesRead: read.entries.length,
      parseErrors: read.errors
    },
    entries
  };
};

const formatPercent = (value: number): string => `${Math.round(value * 1000) / 10}%`;

const formatPointTable = (points: WordCloudPoint[]): string[] => {
  if (points.length === 0) {
    return ["No terms in this range."];
  }

  return [
    "| # | Term | Count | Share |",
    "|---:|---|---:|---:|",
    ...points.map(
      (point, index) =>
        `| ${index + 1} | ${point.term} | ${point.count} | ${formatPercent(point.share)} |`
    )
  ];
};

export const formatWordCloudMarkdown = (report: WordCloudReport): string => {
  const fileList =
    report.source.files.length === 0
      ? "none"
      : report.source.files.map((file) => basename(file)).join(", ");

  return [
    "# Rime Input Word Cloud",
    "",
    `Range: ${report.range.label} (${report.range.startAt} -> ${report.range.endAt})`,
    `Raw dir: ${report.source.rawDir}`,
    `Files: ${fileList}`,
    `Commits: ${report.totals.commits}`,
    `Characters: ${report.totals.characters}`,
    report.source.parseErrors.length > 0
      ? `Parse errors: ${report.source.parseErrors.length}`
      : "Parse errors: 0",
    "",
    "## Word Cloud",
    "",
    ...formatPointTable(report.wordCloud),
    "",
    "## New Terms",
    "",
    ...formatPointTable(report.newTerms),
    "",
    "## Rising Terms",
    "",
    ...formatPointTable(report.risingTerms)
  ].join("\n");
};

export const formatEventsMarkdown = (report: EventsReport): string => {
  const lines = report.entries.map(
    (entry) => `- ${entry.occurredAt} [${entry.schemaId}] ${entry.text}`
  );

  return [
    "# Rime Input Events",
    "",
    `Range: ${report.range.label} (${report.range.startAt} -> ${report.range.endAt})`,
    `Raw dir: ${report.source.rawDir}`,
    `Entries: ${report.entries.length}`,
    `Parse errors: ${report.source.parseErrors.length}`,
    "",
    ...(lines.length > 0 ? lines : ["No events in this range."])
  ].join("\n");
};

export const ensureJournalDirectories = (options: ReadJournalOptions = {}): string => {
  const rawDir = resolveRawDir(options);
  mkdirSync(rawDir, { recursive: true });
  return rawDir;
};
