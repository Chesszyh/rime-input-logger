import type {
  InputRecordEvent,
  MetricCard,
  SessionSummary,
  StatsSnapshot,
  TimeRange,
  TrendPoint
} from "../../contracts/src/index";
import {
  listDateKeysInResolvedRange,
  toDateKeyFromIso,
  type ResolvedRange
} from "./range-filter";

export type TimelineGranularity = "day" | "week" | "month";

export interface AggregateStatsInput {
  range: TimeRange;
  events: InputRecordEvent[];
  previousEvents: InputRecordEvent[];
  sessionSummary: SessionSummary;
}

interface TrendAccumulator {
  chars: number;
  entries: number;
  tokens: number;
}

const usableEvent = (event: InputRecordEvent): boolean =>
  !event.isDeleted && !event.isFiltered && event.normalizedText.trim().length > 0;

const toAccumulator = (): TrendAccumulator => ({
  chars: 0,
  entries: 0,
  tokens: 0
});

const toTrendPoint = (bucket: string, value: TrendAccumulator): TrendPoint => ({
  bucket,
  chars: value.chars,
  entries: value.entries,
  tokens: value.tokens
});

const parseDateKey = (dateKey: string): Date =>
  new Date(`${dateKey}T00:00:00Z`);

const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const shiftDateKey = (dateKey: string, days: number): string => {
  const date = parseDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);

  return toDateKey(date);
};

const toIsoWeekKey = (dateKey: string): string => {
  const date = parseDateKey(dateKey);
  const day = date.getUTCDay() || 7;

  date.setUTCDate(date.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );

  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};

const toMonthKey = (dateKey: string): string => dateKey.slice(0, 7);

const toGroupedTimeline = (
  events: InputRecordEvent[],
  resolveBucket: (event: InputRecordEvent) => string
): TrendPoint[] => {
  const grouped = new Map<string, TrendAccumulator>();

  events.filter(usableEvent).forEach((event) => {
    const bucket = resolveBucket(event);
    const current = grouped.get(bucket) ?? toAccumulator();

    current.chars += event.charCount;
    current.entries += 1;
    current.tokens += event.tokenCount;

    grouped.set(bucket, current);
  });

  return [...grouped.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([bucket, value]) => toTrendPoint(bucket, value));
};

const toDailyTimelineForRange = (
  range: TimeRange,
  events: InputRecordEvent[]
): TrendPoint[] => {
  const dateKeys =
    range.startAt && range.endAt
      ? listDateKeysInResolvedRange(range as ResolvedRange)
      : Array.from(new Set(events.filter(usableEvent).map((event) => event.dateKey))).sort();

  const totals = new Map<string, TrendAccumulator>();
  events.filter(usableEvent).forEach((event) => {
    const current = totals.get(event.dateKey) ?? toAccumulator();

    current.chars += event.charCount;
    current.entries += 1;
    current.tokens += event.tokenCount;

    totals.set(event.dateKey, current);
  });

  return dateKeys.map((dateKey) =>
    toTrendPoint(dateKey, totals.get(dateKey) ?? toAccumulator())
  );
};

const computeStreakDays = (
  activeDateKeys: Set<string>,
  range: TimeRange
): number => {
  if (activeDateKeys.size === 0 || !range.endAt) {
    return 0;
  }

  let cursor = toDateKeyFromIso(range.endAt);
  const earliest = range.startAt ? toDateKeyFromIso(range.startAt) : undefined;
  let streak = 0;

  while (activeDateKeys.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);

    if (earliest && cursor < earliest) {
      break;
    }
  }

  return streak;
};

const computeDelta = (current: number, previous: number): number => {
  if (previous <= 0) {
    return current === 0 ? 0 : 100;
  }

  return Math.round(((current - previous) / previous) * 100);
};

const latestInput = (events: InputRecordEvent[]): string => {
  const latest = events
    .filter(usableEvent)
    .reduce<string | null>((current, event) => {
      if (!current) {
        return event.occurredAt;
      }

      return event.occurredAt > current ? event.occurredAt : current;
    }, null);

  return latest ?? "-";
};

export const buildTimelineByGranularity = (
  events: InputRecordEvent[],
  granularity: TimelineGranularity
): TrendPoint[] => {
  if (granularity === "day") {
    return toGroupedTimeline(events, (event) => event.dateKey);
  }

  if (granularity === "week") {
    return toGroupedTimeline(events, (event) => toIsoWeekKey(event.dateKey));
  }

  return toGroupedTimeline(events, (event) => toMonthKey(event.dateKey));
};

export const aggregateStatsSnapshot = (
  input: AggregateStatsInput
): StatsSnapshot => {
  const currentEvents = input.events.filter(usableEvent);
  const previousEvents = input.previousEvents.filter(usableEvent);

  const inputChars = currentEvents.reduce((sum, event) => sum + event.charCount, 0);
  const inputEntries = currentEvents.length;
  const activeDateKeys = new Set(currentEvents.map((event) => event.dateKey));
  const previousChars = previousEvents.reduce(
    (sum, event) => sum + event.charCount,
    0
  );

  const metrics: MetricCard[] = [
    {
      key: "input-chars",
      label: "输入字数",
      value: inputChars,
      unit: "字",
      delta: computeDelta(inputChars, previousChars),
      deltaLabel: "较上周期"
    },
    {
      key: "input-entries",
      label: "输入条数",
      value: inputEntries,
      unit: "条"
    },
    {
      key: "active-days",
      label: "活跃天数",
      value: activeDateKeys.size,
      unit: "天"
    },
    {
      key: "streak-days",
      label: "连续活跃",
      value: computeStreakDays(activeDateKeys, input.range),
      unit: "天"
    },
    {
      key: "latest-input",
      label: "最近输入",
      value: latestInput(currentEvents)
    }
  ];

  return {
    range: input.range,
    metrics,
    timeline: toDailyTimelineForRange(input.range, currentEvents),
    hourlyBuckets: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      chars: 0,
      entries: 0
    })),
    heatmap: [],
    sessionSummary: input.sessionSummary,
    highlights: []
  };
};
