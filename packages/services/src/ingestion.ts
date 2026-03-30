import type {
  AppScreeningScope,
  DailyRecordArchive,
  FilterRule,
  IngestionDroppedRecord,
  IngestionReadQuery,
  IngestionResult,
  InputRecordEvent,
  InputSession,
  RawInputRecord,
  SessionIntensity,
  UserSettings
} from "../../contracts/src/index";

export interface ProcessRawRecordsInput {
  records: RawInputRecord[];
  timezone: string;
  settings: UserSettings;
  duplicateWindowSeconds?: number;
}

export interface AgentARepresentativeCase {
  id: string;
  title: string;
  timezone: string;
  settings: UserSettings;
  input: RawInputRecord[];
}

export interface AgentARepresentativeOutput {
  id: string;
  title: string;
  output: IngestionResult;
}

const defaultDuplicateWindowSeconds = 2;
const dayMs = 24 * 60 * 60 * 1000;

const symbolOnlyPattern = /^[\p{P}\p{S}]+$/u;
const containsHanPattern = /\p{Script=Han}/u;
const containsLatinPattern = /[A-Za-z]/;
const containsAlnumPattern = /[\p{L}\p{N}]/u;

const maskText = (text: string): string =>
  text
    .replace(/\d/g, "*")
    .replace(/(token|password|secret|密码)/gi, "***");

const normalizeText = (text: string): string => text.trim().replace(/\s+/g, " ");

const detectLanguage = (normalizedText: string): InputRecordEvent["textLanguage"] => {
  if (!normalizedText) {
    return "mixed";
  }

  const hasHan = containsHanPattern.test(normalizedText);
  const hasLatin = containsLatinPattern.test(normalizedText);

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

const estimateTokenCount = (normalizedText: string): number => {
  if (!normalizedText) {
    return 0;
  }

  if (normalizedText.includes(" ")) {
    return normalizedText.split(/\s+/).filter(Boolean).length;
  }

  if (containsHanPattern.test(normalizedText)) {
    return normalizedText.length;
  }

  return 1;
};

const parseDate = (value: string): Date | null => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const formatDateKey = (date: Date, timezone: string): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return date.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
};

const matchAppRule = (record: RawInputRecord, rule: FilterRule): boolean => {
  if (rule.type !== "app" || !rule.enabled) {
    return false;
  }

  const pattern = rule.pattern.toLowerCase();
  const appId = record.appId.toLowerCase();
  const appName = record.appName.toLowerCase();

  return appId.includes(pattern) || appName.includes(pattern);
};

const matchTextRule = (normalizedText: string, rule: FilterRule): boolean => {
  if (!rule.enabled || !normalizedText) {
    return false;
  }

  if (rule.type === "term") {
    return normalizedText.includes(rule.pattern);
  }

  if (rule.type === "regex") {
    try {
      return new RegExp(rule.pattern, "i").test(normalizedText);
    } catch {
      return false;
    }
  }

  return false;
};

const getFilterDecision = (
  record: RawInputRecord,
  normalizedText: string,
  settings: UserSettings
): { scope: AppScreeningScope; reasons: string[] } => {
  const reasons = new Set<string>();
  let scope: AppScreeningScope = "allow";

  if (record.manualIgnore) {
    scope = "ignored";
    reasons.add("manual-ignore");
  }

  if (!normalizedText) {
    scope = "ignored";
    reasons.add("empty-text");
  } else if (symbolOnlyPattern.test(normalizedText)) {
    scope = "ignored";
    reasons.add("symbol-only");
  } else if (normalizedText.length === 1 && !containsAlnumPattern.test(normalizedText)) {
    scope = "ignored";
    reasons.add("short-noise");
  }

  for (const rule of settings.filterRules) {
    if (matchAppRule(record, rule)) {
      scope = "blocked";
      reasons.add(rule.reason || rule.id);
    }
  }

  for (const rule of settings.filterRules) {
    if (rule.type === "app") {
      continue;
    }

    if (matchTextRule(normalizedText, rule)) {
      scope = "blocked";
      reasons.add(rule.reason || rule.id);
    }
  }

  return {
    scope,
    reasons: [...reasons]
  };
};

const toRawText = (
  text: string,
  retentionMode: UserSettings["retention"]["mode"],
  scope: AppScreeningScope
): string | null => {
  if (scope !== "allow") {
    return null;
  }

  if (retentionMode === "store-raw") {
    return text;
  }

  return null;
};

const toMaskedText = (
  normalizedText: string,
  retentionMode: UserSettings["retention"]["mode"],
  scope: AppScreeningScope
): string | null => {
  if (scope !== "allow") {
    return null;
  }

  if (retentionMode === "stats-only") {
    return null;
  }

  return maskText(normalizedText);
};

const classifySessionIntensity = (durationSeconds: number, totalChars: number): SessionIntensity => {
  if (durationSeconds >= 1800 || totalChars >= 120) {
    return "deep-focus";
  }

  if (durationSeconds >= 300 || totalChars >= 30) {
    return "normal";
  }

  return "light";
};

const buildSessions = (
  events: InputRecordEvent[],
  timezone: string,
  sessionGapSeconds: number
): InputSession[] => {
  const activeEvents = events.filter((event) => !event.isFiltered);
  if (activeEvents.length === 0) {
    return [];
  }

  type MutableSession = {
    id: string;
    startedAt: string;
    endedAt: string;
    dateKey: string;
    timezone: string;
    eventIds: string[];
    totalChars: number;
    totalTokens: number;
    idleGapSeconds: number;
    crossedMidnight: boolean;
  };

  const sessions: MutableSession[] = [];
  let current: MutableSession | null = null;
  let previousAtMs = 0;

  const openSession = (event: InputRecordEvent, index: number): MutableSession => ({
    id: `ses-auto-${String(index + 1).padStart(3, "0")}`,
    startedAt: event.occurredAt,
    endedAt: event.occurredAt,
    dateKey: event.dateKey,
    timezone,
    eventIds: [event.id],
    totalChars: event.charCount,
    totalTokens: event.tokenCount,
    idleGapSeconds: 0,
    crossedMidnight: false
  });

  for (const event of activeEvents) {
    const currentAt = parseDate(event.occurredAt);
    if (!currentAt) {
      continue;
    }

    const currentAtMs = currentAt.getTime();

    if (!current) {
      current = openSession(event, sessions.length);
      event.sessionId = current.id;
      previousAtMs = currentAtMs;
      continue;
    }

    const gapSeconds = Math.max(0, Math.round((currentAtMs - previousAtMs) / 1000));

    if (gapSeconds > sessionGapSeconds) {
      sessions.push(current);
      current = openSession(event, sessions.length);
      event.sessionId = current.id;
      previousAtMs = currentAtMs;
      continue;
    }

    current.endedAt = event.occurredAt;
    current.eventIds.push(event.id);
    current.totalChars += event.charCount;
    current.totalTokens += event.tokenCount;
    current.idleGapSeconds = Math.max(current.idleGapSeconds, gapSeconds);
    current.crossedMidnight = current.crossedMidnight || event.dateKey !== current.dateKey;

    event.sessionId = current.id;
    previousAtMs = currentAtMs;
  }

  if (current) {
    sessions.push(current);
  }

  return sessions.map((session) => {
    const startedAt = parseDate(session.startedAt);
    const endedAt = parseDate(session.endedAt);
    const durationSeconds =
      startedAt && endedAt
        ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000))
        : 0;

    return {
      id: session.id,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      dateKey: session.dateKey,
      timezone: session.timezone,
      eventIds: session.eventIds,
      totalChars: session.totalChars,
      totalTokens: session.totalTokens,
      durationSeconds,
      idleGapSeconds: session.idleGapSeconds,
      crossedMidnight: session.crossedMidnight,
      intensity: classifySessionIntensity(durationSeconds, session.totalChars)
    };
  });
};

const buildDailyArchive = (events: InputRecordEvent[]): DailyRecordArchive[] => {
  const archive = new Map<string, DailyRecordArchive>();

  for (const event of events) {
    const existing = archive.get(event.dateKey) ?? {
      dateKey: event.dateKey,
      eventIds: [],
      activeEventIds: [],
      filteredEventIds: [],
      sessionIds: []
    };

    existing.eventIds.push(event.id);

    if (event.isFiltered) {
      existing.filteredEventIds.push(event.id);
    } else {
      existing.activeEventIds.push(event.id);
    }

    if (event.sessionId && !existing.sessionIds.includes(event.sessionId)) {
      existing.sessionIds.push(event.sessionId);
    }

    archive.set(event.dateKey, existing);
  }

  return [...archive.values()].sort((left, right) => left.dateKey.localeCompare(right.dateKey));
};

type QueryBounds = {
  startDateKey?: string;
  endDateKey?: string;
  startAtMs?: number;
  endAtMs?: number;
};

const resolveQueryBounds = (query: IngestionReadQuery): QueryBounds => {
  if (query.preset === "all-time") {
    return {};
  }

  const nowDate = parseDate(query.nowAt ?? new Date().toISOString()) ?? new Date();
  const nowDateKey = formatDateKey(nowDate, query.timezone);

  if (query.preset === "today") {
    return { startDateKey: nowDateKey, endDateKey: nowDateKey };
  }

  if (query.preset === "yesterday") {
    const yesterday = new Date(nowDate.getTime() - dayMs);
    const dateKey = formatDateKey(yesterday, query.timezone);

    return { startDateKey: dateKey, endDateKey: dateKey };
  }

  if (query.preset === "last-7-days") {
    const start = new Date(nowDate.getTime() - 6 * dayMs);
    return {
      startDateKey: formatDateKey(start, query.timezone),
      endDateKey: nowDateKey
    };
  }

  if (query.preset === "last-30-days") {
    const start = new Date(nowDate.getTime() - 29 * dayMs);
    return {
      startDateKey: formatDateKey(start, query.timezone),
      endDateKey: nowDateKey
    };
  }

  if (query.preset === "this-month") {
    const monthStart = `${nowDateKey.slice(0, 8)}01`;
    return {
      startDateKey: monthStart,
      endDateKey: nowDateKey
    };
  }

  if (query.preset === "custom") {
    const startDate = query.startAt ? parseDate(query.startAt) : null;
    const endDate = query.endAt ? parseDate(query.endAt) : null;

    return {
      startDateKey: startDate ? formatDateKey(startDate, query.timezone) : undefined,
      endDateKey: endDate ? formatDateKey(endDate, query.timezone) : undefined,
      startAtMs: startDate?.getTime(),
      endAtMs: endDate?.getTime()
    };
  }

  return {};
};

const inDateBounds = (dateKey: string, bounds: QueryBounds): boolean => {
  if (bounds.startDateKey && dateKey < bounds.startDateKey) {
    return false;
  }

  if (bounds.endDateKey && dateKey > bounds.endDateKey) {
    return false;
  }

  return true;
};

const inCustomEventBounds = (occurredAt: string, bounds: QueryBounds): boolean => {
  const occurredAtDate = parseDate(occurredAt);
  if (!occurredAtDate) {
    return false;
  }

  const occurredAtMs = occurredAtDate.getTime();

  if (typeof bounds.startAtMs === "number" && occurredAtMs < bounds.startAtMs) {
    return false;
  }

  if (typeof bounds.endAtMs === "number" && occurredAtMs > bounds.endAtMs) {
    return false;
  }

  return true;
};

const inCustomSessionBounds = (session: InputSession, bounds: QueryBounds): boolean => {
  const startedAt = parseDate(session.startedAt);
  const endedAt = parseDate(session.endedAt);

  if (!startedAt || !endedAt) {
    return false;
  }

  const startedAtMs = startedAt.getTime();
  const endedAtMs = endedAt.getTime();

  if (typeof bounds.startAtMs === "number" && endedAtMs < bounds.startAtMs) {
    return false;
  }

  if (typeof bounds.endAtMs === "number" && startedAtMs > bounds.endAtMs) {
    return false;
  }

  return true;
};

const inSessionDateBounds = (
  session: InputSession,
  bounds: QueryBounds,
  timezone: string
): boolean => {
  const startedAt = parseDate(session.startedAt);
  const endedAt = parseDate(session.endedAt);
  const startedDateKey = startedAt
    ? formatDateKey(startedAt, timezone)
    : session.dateKey;
  const endedDateKey = endedAt
    ? formatDateKey(endedAt, timezone)
    : startedDateKey;

  if (bounds.startDateKey && endedDateKey < bounds.startDateKey) {
    return false;
  }

  if (bounds.endDateKey && startedDateKey > bounds.endDateKey) {
    return false;
  }

  return true;
};

export const processRawRecords = (input: ProcessRawRecordsInput): IngestionResult => {
  const { records, timezone, settings } = input;

  if (!settings.recordingEnabled) {
    return {
      events: [],
      sessions: [],
      dailyRecords: [],
      dropped: records.map((record) => ({ id: record.id, reason: "recording-disabled" }))
    };
  }

  if (settings.paused) {
    return {
      events: [],
      sessions: [],
      dailyRecords: [],
      dropped: records.map((record) => ({ id: record.id, reason: "recording-paused" }))
    };
  }

  const dropped: IngestionDroppedRecord[] = [];

  const prepared = records
    .map((record, index) => {
      const occurredAt = parseDate(record.occurredAt);
      if (!occurredAt) {
        dropped.push({ id: record.id, reason: "invalid-occurredAt" });
        return null;
      }

      return {
        index,
        occurredAt,
        occurredAtMs: occurredAt.getTime(),
        record
      };
    })
    .filter((item): item is { index: number; occurredAt: Date; occurredAtMs: number; record: RawInputRecord } =>
      item !== null
    )
    .sort((left, right) => {
      if (left.occurredAtMs !== right.occurredAtMs) {
        return left.occurredAtMs - right.occurredAtMs;
      }

      return left.index - right.index;
    });

  const dedupeWindowSeconds = input.duplicateWindowSeconds ?? defaultDuplicateWindowSeconds;
  const recentActiveByKey = new Map<string, number>();

  const events: InputRecordEvent[] = [];

  for (const item of prepared) {
    const { record, occurredAt, occurredAtMs } = item;
    const normalizedText = normalizeText(record.text);
    const decision = getFilterDecision(record, normalizedText, settings);
    const isFiltered = decision.reasons.length > 0;

    const visibleText = isFiltered ? "" : normalizedText;

    if (!isFiltered) {
      const dedupeKey = `${record.appId}::${visibleText}`;
      const previousTimestamp = recentActiveByKey.get(dedupeKey);

      if (
        typeof previousTimestamp === "number" &&
        (occurredAtMs - previousTimestamp) / 1000 <= dedupeWindowSeconds
      ) {
        dropped.push({ id: record.id, reason: "duplicate-input" });
        continue;
      }

      recentActiveByKey.set(dedupeKey, occurredAtMs);
    }

    const event: InputRecordEvent = {
      id: record.id,
      occurredAt: record.occurredAt,
      dateKey: formatDateKey(occurredAt, timezone),
      timezone,
      schemaVersion: "1.0",
      source: record.source ?? "rime",
      appId: record.appId,
      appName: record.appName,
      scope: decision.scope,
      sessionId: null,
      rawText: toRawText(record.text, settings.retention.mode, decision.scope),
      maskedText: toMaskedText(visibleText, settings.retention.mode, decision.scope),
      normalizedText: visibleText,
      textLanguage: detectLanguage(visibleText),
      charCount: visibleText.length,
      tokenCount: estimateTokenCount(visibleText),
      candidateIndex: decision.scope === "allow" ? record.candidateIndex ?? null : null,
      isDeleted: false,
      isFiltered,
      filterReasons: decision.reasons,
      tags: record.tags ?? (isFiltered ? ["filtered"] : [])
    };

    events.push(event);
  }

  const sessions = buildSessions(events, timezone, settings.sessionGapSeconds);
  const dailyRecords = buildDailyArchive(events);

  return {
    events,
    sessions,
    dailyRecords,
    dropped
  };
};

export const readEvents = (
  events: InputRecordEvent[],
  query: IngestionReadQuery
): InputRecordEvent[] => {
  const bounds = resolveQueryBounds(query);

  if (
    query.preset === "custom" &&
    (typeof bounds.startAtMs === "number" || typeof bounds.endAtMs === "number")
  ) {
    return events.filter((event) => inCustomEventBounds(event.occurredAt, bounds));
  }

  return events.filter((event) => inDateBounds(event.dateKey, bounds));
};

export const readSessions = (
  sessions: InputSession[],
  query: IngestionReadQuery
): InputSession[] => {
  const bounds = resolveQueryBounds(query);

  if (
    query.preset === "custom" &&
    (typeof bounds.startAtMs === "number" || typeof bounds.endAtMs === "number")
  ) {
    return sessions.filter((session) => inCustomSessionBounds(session, bounds));
  }

  return sessions.filter((session) =>
    inSessionDateBounds(session, bounds, query.timezone)
  );
};

const representativeSettings: UserSettings = {
  recordingEnabled: true,
  paused: false,
  retention: {
    mode: "store-masked",
    retentionDays: 90,
    autoArchive: true,
    exportMaskingEnabled: true
  },
  filterRules: [
    {
      id: "rule-password-manager",
      type: "app",
      pattern: "com.bitwarden.desktop",
      enabled: true,
      reason: "sensitive app"
    }
  ],
  stopWords: ["的", "了", "是", "我"],
  sessionGapSeconds: 600
};

const representativeCases: AgentARepresentativeCase[] = [
  {
    id: "agent-a-normalized-flow",
    title: "包含过滤、去重与跨日会话的代表性样例",
    timezone: "Asia/Shanghai",
    settings: representativeSettings,
    input: [
      {
        id: "sample-001",
        occurredAt: "2026-03-30T23:58:00+08:00",
        appId: "md.obsidian",
        appName: "Obsidian",
        text: "会话开始"
      },
      {
        id: "sample-002",
        occurredAt: "2026-03-30T23:59:20+08:00",
        appId: "md.obsidian",
        appName: "Obsidian",
        text: "会话继续"
      },
      {
        id: "sample-003",
        occurredAt: "2026-03-31T00:03:00+08:00",
        appId: "md.obsidian",
        appName: "Obsidian",
        text: "跨日会话"
      },
      {
        id: "sample-004",
        occurredAt: "2026-03-31T00:03:01+08:00",
        appId: "md.obsidian",
        appName: "Obsidian",
        text: "跨日会话"
      },
      {
        id: "sample-005",
        occurredAt: "2026-03-31T00:10:00+08:00",
        appId: "com.bitwarden.desktop",
        appName: "Bitwarden",
        text: "token 123"
      }
    ]
  }
];

export const getRepresentativeCases = (): AgentARepresentativeCase[] => representativeCases;

export const getRepresentativeOutputs = (): AgentARepresentativeOutput[] =>
  representativeCases.map((sample) => ({
    id: sample.id,
    title: sample.title,
    output: processRawRecords({
      records: sample.input,
      timezone: sample.timezone,
      settings: sample.settings
    })
  }));

export const createIngestionService = () => ({
  processRawRecords,
  readEvents,
  readSessions,
  getRepresentativeCases,
  getRepresentativeOutputs
});
