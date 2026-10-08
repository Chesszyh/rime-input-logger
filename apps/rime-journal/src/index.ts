import type { TimeRangePreset } from "../../../packages/contracts/src/index";
import {
  buildEventsReport,
  buildWordCloudReport,
  ensureJournalDirectories,
  formatEventsMarkdown,
  formatWordCloudMarkdown
} from "../../../packages/rime-journal/src/index";

type Command = "wordcloud" | "events" | "init";
type OutputFormat = "markdown" | "json";

interface CliOptions {
  command: Command;
  root?: string;
  rawDir?: string;
  preset?: TimeRangePreset;
  date?: string;
  week?: string;
  startAt?: string;
  endAt?: string;
  nowIso?: string;
  limit?: number;
  format: OutputFormat;
}

const validPresets = new Set<TimeRangePreset>([
  "today",
  "yesterday",
  "last-7-days",
  "last-30-days",
  "this-month",
  "custom",
  "all-time"
]);

const usage = (): string =>
  [
    "Usage:",
    "  npm run rime:journal -- wordcloud [--preset today] [--format markdown|json]",
    "  npm run rime:journal -- wordcloud --date YYYY-MM-DD",
    "  npm run rime:journal -- wordcloud --week YYYY-WNN",
    "  npm run rime:journal -- events --date YYYY-MM-DD",
    "  npm run rime:journal -- init",
    "",
    "Options:",
    "  --root DIR       Journal root; overrides RIME_COMMIT_LOG_ROOT and the default",
    "  --raw-dir DIR    Raw JSONL directory, overrides --root/raw",
    "  --preset NAME    today, yesterday, last-7-days, last-30-days, this-month, all-time",
    "  --date DATE      Exact local date, for example 2026-06-08",
    "  --week WEEK      ISO week, for example 2026-W24",
    "  --start-at ISO   Custom range start (requires --end-at)",
    "  --end-at ISO     Custom range end (requires --start-at)",
    "  --now ISO        Reference time for relative presets",
    "  --limit N        Positive integer term/event limit",
    "  --format FORMAT  markdown or json"
  ].join("\n");

const parseArgs = (argv: string[]): CliOptions => {
  const commandIndex = argv.findIndex(
    (token) => !token.startsWith("-") && ["wordcloud", "events", "init"].includes(token)
  );
  const command = commandIndex >= 0 ? (argv[commandIndex] as Command) : undefined;

  if (!command || !["wordcloud", "events", "init"].includes(command)) {
    throw new Error(usage());
  }

  const options: CliOptions = {
    command,
    format: "markdown"
  };
  const optionTokens = [
    ...argv.slice(0, commandIndex),
    ...argv.slice(commandIndex + 1)
  ];

  for (let index = 0; index < optionTokens.length; index += 1) {
    const token = optionTokens[index];
    const value = optionTokens[index + 1];

    if (token === "--root" && value) {
      options.root = value;
      index += 1;
      continue;
    }
    if (token === "--raw-dir" && value) {
      options.rawDir = value;
      index += 1;
      continue;
    }
    if (token === "--preset" && value) {
      if (!validPresets.has(value as TimeRangePreset)) {
        throw new Error(`Unsupported preset: ${value}`);
      }
      options.preset = value as TimeRangePreset;
      index += 1;
      continue;
    }
    if (token === "--date" && value) {
      options.date = value;
      index += 1;
      continue;
    }
    if (token === "--week" && value) {
      options.week = value;
      index += 1;
      continue;
    }
    if (token === "--start-at" && value) {
      options.startAt = value;
      index += 1;
      continue;
    }
    if (token === "--end-at" && value) {
      options.endAt = value;
      index += 1;
      continue;
    }
    if (token === "--now" && value) {
      options.nowIso = value;
      index += 1;
      continue;
    }
    if (token === "--limit" && value) {
      options.limit = Number(value);
      if (!Number.isInteger(options.limit) || options.limit <= 0) {
        throw new Error("--limit must be a positive integer");
      }
      index += 1;
      continue;
    }
    if (token === "--format" && value) {
      if (value !== "markdown" && value !== "json") {
        throw new Error(`Unsupported format: ${value}`);
      }
      options.format = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}\n\n${usage()}`);
  }

  return options;
};

const run = (): void => {
  if (process.argv.slice(2).includes("--help")) {
    console.log(usage());
    return;
  }
  const options = parseArgs(process.argv.slice(2));

  if (options.command === "init") {
    const rawDir = ensureJournalDirectories(options);
    console.log(`Created journal directory: ${rawDir}`);
    return;
  }

  if (options.command === "events") {
    const report = buildEventsReport(options);
    console.log(options.format === "json" ? JSON.stringify(report, null, 2) : formatEventsMarkdown(report));
    return;
  }

  const report = buildWordCloudReport(options);
  console.log(options.format === "json" ? JSON.stringify(report, null, 2) : formatWordCloudMarkdown(report));
};

try {
  run();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
