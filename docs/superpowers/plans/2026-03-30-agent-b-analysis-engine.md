# Agent B Analysis Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modular analytics engine that turns `InputRecordEvent` / `InputSession` streams into stable P0/P1 statistics, vocabulary insights, time activity data, and report-ready summaries.

**Architecture:** Add a pure-computation `packages/analytics` workspace module with focused analyzers (range, stats, vocabulary, time, session, summary). Keep `packages/services` as orchestration: resolve scenario, call analytics, and return `DashboardBootstrap` without post-processing in UI. Use deterministic algorithms and fixed field naming from `packages/contracts`.

**Tech Stack:** TypeScript (ESM), Vitest, existing contracts/mock-data/services packages

---

## File Structure And Responsibilities

- Create: `packages/analytics/src/index.ts` — public composition API for all Agent B analyzers
- Create: `packages/analytics/src/range-filter.ts` — preset/custom range resolution and current/previous window filtering
- Create: `packages/analytics/src/stats-aggregation.ts` — metrics, daily/weekly/monthly timeline, active/streak stats
- Create: `packages/analytics/src/vocabulary-analysis.ts` — tokenization, stopword/noise filtering, top/new/rising/falling/phrase insights
- Create: `packages/analytics/src/time-activity-analysis.ts` — hourly distribution + date × time-slice heatmap cells
- Create: `packages/analytics/src/session-analysis.ts` — session count, avg/max duration, deep-focus count
- Create: `packages/analytics/src/summary-generator.ts` — user-facing highlights and report summary fragments
- Modify: `packages/services/src/index.ts` — replace precomputed fixture stats usage with analytics engine output
- Create: `tests/agentB.range-filter.test.ts` — range preset/custom correctness + previous-window correctness
- Create: `tests/agentB.stats-aggregation.test.ts` — base metrics, timeline buckets, streak, active day coverage
- Create: `tests/agentB.vocabulary-analysis.test.ts` — top/new/rising/falling/phrase outputs + noise filtering
- Create: `tests/agentB.time-session.test.ts` — hourly/heatmap/session summary correctness
- Create: `tests/agentB.services.integration.test.ts` — end-to-end service output shape and state behavior
- Create: `docs/contracts/agent-b-sample-io.md` — sample input/output mapping for downstream agents
- Create: `docs/architecture/agent-b-edge-cases.md` — edge-case decisions and expected behavior

---

### Task 1: Build Range Filtering Foundation

**Files:**
- Create: `tests/agentB.range-filter.test.ts`
- Create: `packages/analytics/src/range-filter.ts`
- Create: `packages/analytics/src/index.ts`

- [ ] **Step 1: Write the failing range tests**

```ts
import { describe, expect, it } from "vitest";
import type { InputRecordEvent, InputSession } from "../packages/contracts/src/index";
import {
  buildPreviousRange,
  filterRecordsByResolvedRange,
  filterSessionsByResolvedRange,
  resolveRangeFromQuery
} from "../packages/analytics/src/range-filter";

const timezone = "Asia/Shanghai";

const makeEvent = (id: string, occurredAt: string): InputRecordEvent => ({
  id,
  occurredAt,
  dateKey: occurredAt.slice(0, 10),
  timezone,
  schemaVersion: "1.0",
  source: "mock",
  appId: "test.app",
  appName: "Test",
  scope: "allow",
  sessionId: null,
  rawText: null,
  maskedText: "输入分析",
  normalizedText: "输入分析",
  textLanguage: "zh-CN",
  charCount: 4,
  tokenCount: 1,
  candidateIndex: 1,
  isDeleted: false,
  isFiltered: false,
  filterReasons: [],
  tags: []
});

const makeSession = (id: string, startedAt: string, endedAt: string): InputSession => ({
  id,
  startedAt,
  endedAt,
  dateKey: startedAt.slice(0, 10),
  timezone,
  eventIds: [],
  totalChars: 10,
  totalTokens: 2,
  durationSeconds: 600,
  idleGapSeconds: 60,
  crossedMidnight: false,
  intensity: "normal"
});

describe("agent B range filter", () => {
  it("resolves last-7-days with deterministic boundaries", () => {
    const resolved = resolveRangeFromQuery(
      { preset: "last-7-days", timezone, label: "近7天" },
      "2026-03-30T12:00:00+08:00"
    );

    expect(resolved.startAt).toBe("2026-03-24T00:00:00+08:00");
    expect(resolved.endAt).toBe("2026-03-30T23:59:59+08:00");
  });

  it("filters records and sessions within range", () => {
    const resolved = resolveRangeFromQuery(
      { preset: "today", timezone, label: "今天" },
      "2026-03-30T08:00:00+08:00"
    );

    const records = [
      makeEvent("e1", "2026-03-30T01:00:00+08:00"),
      makeEvent("e2", "2026-03-29T23:00:00+08:00")
    ];
    const sessions = [
      makeSession("s1", "2026-03-30T02:00:00+08:00", "2026-03-30T02:10:00+08:00"),
      makeSession("s2", "2026-03-29T22:00:00+08:00", "2026-03-29T22:30:00+08:00")
    ];

    expect(filterRecordsByResolvedRange(records, resolved).map((r) => r.id)).toEqual(["e1"]);
    expect(filterSessionsByResolvedRange(sessions, resolved).map((s) => s.id)).toEqual(["s1"]);
  });

  it("builds previous window with equal duration", () => {
    const current = resolveRangeFromQuery(
      { preset: "last-7-days", timezone, label: "近7天" },
      "2026-03-30T08:00:00+08:00"
    );

    const previous = buildPreviousRange(current);
    expect(previous.startAt).toBe("2026-03-17T00:00:00+08:00");
    expect(previous.endAt).toBe("2026-03-23T23:59:59+08:00");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/agentB.range-filter.test.ts`
Expected: FAIL with module resolution error for `packages/analytics/src/range-filter.ts`

- [ ] **Step 3: Write minimal range implementation**

```ts
import type { InputRecordEvent, InputSession, TimeRange } from "../../contracts/src/index";

export interface ResolvedRange extends TimeRange {
  startAt: string;
  endAt: string;
}

const toDate = (iso: string): Date => new Date(iso);
const toIso = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}-${m}-${d}T${h}:${min}:${s}+08:00`;
};

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
const dayEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

export const resolveRangeFromQuery = (
  range: TimeRange,
  nowIso: string
): ResolvedRange => {
  if (range.preset === "custom" && range.startAt && range.endAt) {
    return { ...range, startAt: range.startAt, endAt: range.endAt };
  }

  const now = toDate(nowIso);
  if (range.preset === "all-time") {
    return {
      ...range,
      startAt: "1970-01-01T00:00:00+08:00",
      endAt: toIso(dayEnd(now))
    };
  }

  const end = dayEnd(now);
  const start = dayStart(new Date(now));

  if (range.preset === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  }

  if (range.preset === "last-7-days") {
    start.setDate(start.getDate() - 6);
  }

  if (range.preset === "last-30-days") {
    start.setDate(start.getDate() - 29);
  }

  if (range.preset === "this-month") {
    start.setDate(1);
  }

  return { ...range, startAt: toIso(start), endAt: toIso(end) };
};

export const buildPreviousRange = (current: ResolvedRange): ResolvedRange => {
  const currentStart = toDate(current.startAt);
  const currentEnd = toDate(current.endAt);
  const durationMs = currentEnd.getTime() - currentStart.getTime();

  const prevEnd = new Date(currentStart.getTime() - 1000);
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  return {
    ...current,
    startAt: toIso(prevStart),
    endAt: toIso(prevEnd),
    label: `${current.label}-previous`
  };
};

export const filterRecordsByResolvedRange = (
  records: InputRecordEvent[],
  range: ResolvedRange
): InputRecordEvent[] => {
  const start = toDate(range.startAt).getTime();
  const end = toDate(range.endAt).getTime();
  return records.filter((item) => {
    const t = toDate(item.occurredAt).getTime();
    return t >= start && t <= end;
  });
};

export const filterSessionsByResolvedRange = (
  sessions: InputSession[],
  range: ResolvedRange
): InputSession[] => {
  const start = toDate(range.startAt).getTime();
  const end = toDate(range.endAt).getTime();
  return sessions.filter((item) => {
    const t = toDate(item.startedAt).getTime();
    return t >= start && t <= end;
  });
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/agentB.range-filter.test.ts`
Expected: PASS with 3 passed tests

- [ ] **Step 5: Commit**

```bash
git add tests/agentB.range-filter.test.ts packages/analytics/src/range-filter.ts packages/analytics/src/index.ts
git commit -m "feat: add Agent B range filtering foundation"
```

---

### Task 2: Implement Stats Aggregation (Metrics + Timeline + Streak)

**Files:**
- Create: `tests/agentB.stats-aggregation.test.ts`
- Create: `packages/analytics/src/stats-aggregation.ts`
- Modify: `packages/analytics/src/index.ts`

- [ ] **Step 1: Write failing stats tests**

```ts
import { describe, expect, it } from "vitest";
import type { InputRecordEvent, TimeRange } from "../packages/contracts/src/index";
import {
  aggregateStatsSnapshot,
  buildTimelineByGranularity
} from "../packages/analytics/src/stats-aggregation";

const range: TimeRange = {
  preset: "last-7-days",
  label: "近7天",
  timezone: "Asia/Shanghai",
  startAt: "2026-03-24T00:00:00+08:00",
  endAt: "2026-03-30T23:59:59+08:00"
};

const mk = (id: string, occurredAt: string, chars: number, tokens: number): InputRecordEvent => ({
  id,
  occurredAt,
  dateKey: occurredAt.slice(0, 10),
  timezone: "Asia/Shanghai",
  schemaVersion: "1.0",
  source: "mock",
  appId: "app",
  appName: "App",
  scope: "allow",
  sessionId: null,
  rawText: null,
  maskedText: "text",
  normalizedText: "text",
  textLanguage: "en-US",
  charCount: chars,
  tokenCount: tokens,
  candidateIndex: 1,
  isDeleted: false,
  isFiltered: false,
  filterReasons: [],
  tags: []
});

describe("agent B stats aggregation", () => {
  it("builds metrics and timeline from events", () => {
    const events = [
      mk("e1", "2026-03-29T10:00:00+08:00", 10, 2),
      mk("e2", "2026-03-30T11:00:00+08:00", 20, 4)
    ];

    const result = aggregateStatsSnapshot({
      range,
      events,
      previousEvents: [mk("p1", "2026-03-22T11:00:00+08:00", 15, 3)],
      sessionSummary: {
        count: 2,
        averageDurationSeconds: 900,
        longestDurationSeconds: 1200,
        focusSessionCount: 1
      }
    });

    const chars = result.metrics.find((m) => m.key === "input-chars")?.value;
    const entries = result.metrics.find((m) => m.key === "input-entries")?.value;
    const activeDays = result.metrics.find((m) => m.key === "active-days")?.value;

    expect(chars).toBe(30);
    expect(entries).toBe(2);
    expect(activeDays).toBe(2);
    expect(result.timeline.length).toBe(2);
  });

  it("groups timeline by day/week/month", () => {
    const events = [
      mk("e1", "2026-03-24T10:00:00+08:00", 5, 1),
      mk("e2", "2026-03-30T11:00:00+08:00", 7, 2),
      mk("e3", "2026-04-02T09:00:00+08:00", 9, 2)
    ];

    const day = buildTimelineByGranularity(events, "day");
    const week = buildTimelineByGranularity(events, "week");
    const month = buildTimelineByGranularity(events, "month");

    expect(day.length).toBe(3);
    expect(week.length).toBe(2);
    expect(month.length).toBe(2);
  });

  it("calculates streak from range end backwards", () => {
    const events = [
      mk("e1", "2026-03-29T10:00:00+08:00", 10, 2),
      mk("e2", "2026-03-30T11:00:00+08:00", 20, 4)
    ];

    const result = aggregateStatsSnapshot({
      range,
      events,
      previousEvents: [],
      sessionSummary: {
        count: 1,
        averageDurationSeconds: 400,
        longestDurationSeconds: 400,
        focusSessionCount: 0
      }
    });

    const streak = result.metrics.find((m) => m.key === "streak-days")?.value;
    expect(streak).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/agentB.stats-aggregation.test.ts`
Expected: FAIL with missing exports `aggregateStatsSnapshot` and `buildTimelineByGranularity`

- [ ] **Step 3: Write minimal stats implementation**

```ts
import type {
  InputRecordEvent,
  MetricCard,
  SessionSummary,
  StatsSnapshot,
  TimeRange,
  TrendPoint
} from "../../contracts/src/index";

export interface AggregateStatsInput {
  range: TimeRange;
  events: InputRecordEvent[];
  previousEvents: InputRecordEvent[];
  sessionSummary: SessionSummary;
}

const eventUsable = (e: InputRecordEvent): boolean =>
  !e.isDeleted && !e.isFiltered && e.normalizedText.trim().length > 0;

const groupByDate = (events: InputRecordEvent[]): Map<string, InputRecordEvent[]> => {
  const map = new Map<string, InputRecordEvent[]>();
  for (const e of events) {
    if (!eventUsable(e)) continue;
    const arr = map.get(e.dateKey) ?? [];
    arr.push(e);
    map.set(e.dateKey, arr);
  }
  return map;
};

const calcDelta = (current: number, previous: number): number =>
  previous === 0 ? current : Math.round(((current - previous) / previous) * 100);

export type TimelineGranularity = "day" | "week" | "month";

const weekKey = (isoDate: string): string => {
  const date = new Date(`${isoDate}T00:00:00+08:00`);
  const day = date.getDay() === 0 ? 7 : date.getDay();
  date.setDate(date.getDate() + 4 - day);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
};

const monthKey = (isoDate: string): string => isoDate.slice(0, 7);

export const buildTimelineByGranularity = (
  events: InputRecordEvent[],
  granularity: TimelineGranularity
): TrendPoint[] => {
  const grouped = new Map<string, InputRecordEvent[]>();

  for (const event of events) {
    if (!eventUsable(event)) continue;

    const key =
      granularity === "day"
        ? event.dateKey
        : granularity === "week"
          ? weekKey(event.dateKey)
          : monthKey(event.dateKey);

    const arr = grouped.get(key) ?? [];
    arr.push(event);
    grouped.set(key, arr);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, rows]) => ({
      bucket,
      chars: rows.reduce((sum, e) => sum + e.charCount, 0),
      entries: rows.length,
      tokens: rows.reduce((sum, e) => sum + e.tokenCount, 0)
    }));
};

const computeStreak = (eventsByDate: Map<string, InputRecordEvent[]>, endAt: string): number => {
  let streak = 0;
  const cursor = new Date(endAt);

  while (true) {
    const day = cursor.toISOString().slice(0, 10);
    if (!eventsByDate.has(day)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

export const aggregateStatsSnapshot = (input: AggregateStatsInput): StatsSnapshot => {
  const currentEvents = input.events.filter(eventUsable);
  const previous = input.previousEvents.filter(eventUsable);

  const currentChars = currentEvents.reduce((sum, e) => sum + e.charCount, 0);
  const currentEntries = currentEvents.length;
  const currentTokens = currentEvents.reduce((sum, e) => sum + e.tokenCount, 0);

  const previousChars = previous.reduce((sum, e) => sum + e.charCount, 0);

  const grouped = groupByDate(currentEvents);
  const timeline = buildTimelineByGranularity(currentEvents, "day");

  const metrics: MetricCard[] = [
    {
      key: "input-chars",
      label: "输入字数",
      value: currentChars,
      unit: "字",
      delta: calcDelta(currentChars, previousChars),
      deltaLabel: "较上一周期"
    },
    { key: "input-entries", label: "输入条数", value: currentEntries, unit: "条" },
    { key: "active-days", label: "活跃天数", value: grouped.size, unit: "天" },
    {
      key: "streak-days",
      label: "连续活跃",
      value: computeStreak(grouped, input.range.endAt ?? new Date().toISOString()),
      unit: "天"
    },
    { key: "latest-input", label: "最近输入", value: currentEvents.at(-1)?.occurredAt ?? "-" }
  ];

  return {
    range: input.range,
    metrics,
    timeline,
    hourlyBuckets: Array.from({ length: 24 }, (_, hour) => ({ hour, chars: 0, entries: 0 })),
    heatmap: [],
    sessionSummary: input.sessionSummary,
    highlights: []
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/agentB.stats-aggregation.test.ts`
Expected: PASS with 3 passed tests

- [ ] **Step 5: Commit**

```bash
git add tests/agentB.stats-aggregation.test.ts packages/analytics/src/stats-aggregation.ts packages/analytics/src/index.ts
git commit -m "feat: add Agent B stats aggregation module"
```

---

### Task 3: Implement Vocabulary Analysis (Top/New/Rising/Falling/Phrase)

**Files:**
- Create: `tests/agentB.vocabulary-analysis.test.ts`
- Create: `packages/analytics/src/vocabulary-analysis.ts`
- Modify: `packages/analytics/src/index.ts`

- [ ] **Step 1: Write failing vocabulary tests**

```ts
import { describe, expect, it } from "vitest";
import type { InputRecordEvent } from "../packages/contracts/src/index";
import { analyzeVocabulary } from "../packages/analytics/src/vocabulary-analysis";

const mk = (id: string, text: string, at: string): InputRecordEvent => ({
  id,
  occurredAt: at,
  dateKey: at.slice(0, 10),
  timezone: "Asia/Shanghai",
  schemaVersion: "1.0",
  source: "mock",
  appId: "app",
  appName: "App",
  scope: "allow",
  sessionId: null,
  rawText: null,
  maskedText: text,
  normalizedText: text,
  textLanguage: "zh-CN",
  charCount: text.length,
  tokenCount: 1,
  candidateIndex: 1,
  isDeleted: false,
  isFiltered: false,
  filterReasons: [],
  tags: []
});

describe("agent B vocabulary analysis", () => {
  it("returns top/new/rising/falling lists", () => {
    const current = [
      mk("c1", "输入分析 输入分析 词库迁移", "2026-03-30T10:00:00+08:00"),
      mk("c2", "共享契约", "2026-03-30T12:00:00+08:00")
    ];
    const previous = [
      mk("p1", "输入分析", "2026-03-23T10:00:00+08:00"),
      mk("p2", "旧词", "2026-03-23T11:00:00+08:00")
    ];

    const result = analyzeVocabulary({
      currentEvents: current,
      previousEvents: previous,
      stopWords: ["的", "了", "是"]
    });

    expect(result.topTerms[0]?.term).toBe("输入分析");
    expect(result.newTerms.map((t) => t.term)).toContain("共享契约");
    expect(result.risingTerms.map((t) => t.term)).toContain("输入分析");
    expect(result.fallingTerms.map((t) => t.term)).toContain("旧词");
  });

  it("filters stopwords and noise", () => {
    const current = [mk("c1", "的 了 #", "2026-03-30T10:00:00+08:00")];

    const result = analyzeVocabulary({
      currentEvents: current,
      previousEvents: [],
      stopWords: ["的", "了"]
    });

    expect(result.topTerms.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/agentB.vocabulary-analysis.test.ts`
Expected: FAIL with missing export `analyzeVocabulary`

- [ ] **Step 3: Write minimal vocabulary implementation**

```ts
import type { InputRecordEvent, VocabularyInsight } from "../../contracts/src/index";

export interface VocabularyAnalysisInput {
  currentEvents: InputRecordEvent[];
  previousEvents: InputRecordEvent[];
  stopWords: string[];
}

export interface VocabularyAnalysisResult {
  topTerms: VocabularyInsight[];
  newTerms: VocabularyInsight[];
  risingTerms: VocabularyInsight[];
  fallingTerms: VocabularyInsight[];
  phraseTerms: VocabularyInsight[];
}

const usableEvent = (e: InputRecordEvent): boolean =>
  !e.isDeleted && !e.isFiltered && e.normalizedText.trim().length > 0;

const noise = /^[\p{P}\p{S}\d_]+$/u;

const tokenize = (text: string): string[] =>
  text
    .split(/[\s,，。.!！?？;；、]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && !noise.test(item));

const countTerms = (events: InputRecordEvent[], stopWords: Set<string>): Map<string, { count: number; firstSeenAt: string; lastSeenAt: string; sourceEventIds: string[] }> => {
  const map = new Map<string, { count: number; firstSeenAt: string; lastSeenAt: string; sourceEventIds: string[] }>();

  for (const event of events) {
    if (!usableEvent(event)) continue;
    for (const term of tokenize(event.normalizedText)) {
      if (stopWords.has(term)) continue;
      const prev = map.get(term);
      if (!prev) {
        map.set(term, {
          count: 1,
          firstSeenAt: event.occurredAt,
          lastSeenAt: event.occurredAt,
          sourceEventIds: [event.id]
        });
      } else {
        prev.count += 1;
        prev.lastSeenAt = event.occurredAt;
        prev.sourceEventIds.push(event.id);
      }
    }
  }

  return map;
};

const toInsight = (
  term: string,
  count: number,
  total: number,
  kind: VocabularyInsight["kind"],
  deltaFromPrevious: number,
  firstSeenAt: string,
  lastSeenAt: string,
  sourceEventIds: string[]
): VocabularyInsight => ({
  id: `${kind}-${term}`,
  term,
  normalizedTerm: term,
  kind,
  count,
  share: total === 0 ? 0 : Number((count / total).toFixed(4)),
  deltaFromPrevious,
  firstSeenAt,
  lastSeenAt,
  isStopWord: false,
  sourceEventIds
});

export const analyzeVocabulary = (input: VocabularyAnalysisInput): VocabularyAnalysisResult => {
  const stopWords = new Set(input.stopWords);
  const currentMap = countTerms(input.currentEvents, stopWords);
  const previousMap = countTerms(input.previousEvents, stopWords);

  const total = [...currentMap.values()].reduce((sum, item) => sum + item.count, 0);

  const topTerms = [...currentMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([term, value]) => {
      const previousCount = previousMap.get(term)?.count ?? 0;
      return toInsight(
        term,
        value.count,
        total,
        "top",
        value.count - previousCount,
        value.firstSeenAt,
        value.lastSeenAt,
        value.sourceEventIds
      );
    });

  const newTerms = [...currentMap.entries()]
    .filter(([term]) => !previousMap.has(term))
    .map(([term, value]) =>
      toInsight(term, value.count, total, "new", value.count, value.firstSeenAt, value.lastSeenAt, value.sourceEventIds)
    );

  const risingTerms = [...currentMap.entries()]
    .map(([term, value]) => ({ term, value, delta: value.count - (previousMap.get(term)?.count ?? 0) }))
    .filter((item) => item.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 20)
    .map((item) =>
      toInsight(
        item.term,
        item.value.count,
        total,
        "rising",
        item.delta,
        item.value.firstSeenAt,
        item.value.lastSeenAt,
        item.value.sourceEventIds
      )
    );

  const fallingTerms = [...previousMap.entries()]
    .map(([term, value]) => ({ term, previousCount: value.count, currentCount: currentMap.get(term)?.count ?? 0, value }))
    .filter((item) => item.currentCount < item.previousCount)
    .sort((a, b) => b.previousCount - a.previousCount)
    .slice(0, 20)
    .map((item) =>
      toInsight(
        item.term,
        item.currentCount,
        total,
        "falling",
        item.currentCount - item.previousCount,
        item.value.firstSeenAt,
        item.value.lastSeenAt,
        item.value.sourceEventIds
      )
    );

  const phraseTerms = topTerms
    .filter((item) => item.term.length >= 4)
    .slice(0, 20)
    .map((item) => ({ ...item, kind: "phrase" as const, id: `phrase-${item.term}` }));

  return {
    topTerms,
    newTerms,
    risingTerms,
    fallingTerms,
    phraseTerms
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/agentB.vocabulary-analysis.test.ts`
Expected: PASS with 2 passed tests

- [ ] **Step 5: Commit**

```bash
git add tests/agentB.vocabulary-analysis.test.ts packages/analytics/src/vocabulary-analysis.ts packages/analytics/src/index.ts
git commit -m "feat: add Agent B vocabulary analysis module"
```

---

### Task 4: Implement Time Activity + Session Summary Modules

**Files:**
- Create: `tests/agentB.time-session.test.ts`
- Create: `packages/analytics/src/time-activity-analysis.ts`
- Create: `packages/analytics/src/session-analysis.ts`
- Modify: `packages/analytics/src/index.ts`

- [ ] **Step 1: Write failing time/session tests**

```ts
import { describe, expect, it } from "vitest";
import type { InputRecordEvent, InputSession } from "../packages/contracts/src/index";
import { buildTimeActivity } from "../packages/analytics/src/time-activity-analysis";
import { summarizeSessions } from "../packages/analytics/src/session-analysis";

const event = (id: string, at: string, chars: number): InputRecordEvent => ({
  id,
  occurredAt: at,
  dateKey: at.slice(0, 10),
  timezone: "Asia/Shanghai",
  schemaVersion: "1.0",
  source: "mock",
  appId: "app",
  appName: "App",
  scope: "allow",
  sessionId: null,
  rawText: null,
  maskedText: "text",
  normalizedText: "text",
  textLanguage: "en-US",
  charCount: chars,
  tokenCount: 1,
  candidateIndex: 1,
  isDeleted: false,
  isFiltered: false,
  filterReasons: [],
  tags: []
});

const session = (id: string, startedAt: string, durationSeconds: number, intensity: InputSession["intensity"]): InputSession => ({
  id,
  startedAt,
  endedAt: startedAt,
  dateKey: startedAt.slice(0, 10),
  timezone: "Asia/Shanghai",
  eventIds: [],
  totalChars: 20,
  totalTokens: 4,
  durationSeconds,
  idleGapSeconds: 60,
  crossedMidnight: false,
  intensity
});

describe("agent B time and session analysis", () => {
  it("builds 24-hour buckets and heatmap cells", () => {
    const result = buildTimeActivity([
      event("e1", "2026-03-30T09:15:00+08:00", 10),
      event("e2", "2026-03-30T22:20:00+08:00", 12),
      event("e3", "2026-03-29T22:10:00+08:00", 6)
    ]);

    expect(result.hourlyBuckets.length).toBe(24);
    expect(result.hourlyBuckets[9].chars).toBe(10);
    expect(result.hourlyBuckets[22].chars).toBe(18);
    expect(result.heatmap.length).toBeGreaterThan(0);
  });

  it("summarizes sessions", () => {
    const sessions = [
      session("s1", "2026-03-30T09:10:00+08:00", 600, "normal"),
      session("s2", "2026-03-30T22:00:00+08:00", 1800, "deep-focus")
    ];

    const summary = summarizeSessions(sessions);
    expect(summary.count).toBe(2);
    expect(summary.longestDurationSeconds).toBe(1800);
    expect(summary.focusSessionCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/agentB.time-session.test.ts`
Expected: FAIL with missing modules `time-activity-analysis` and `session-analysis`

- [ ] **Step 3: Write minimal time/session implementation**

```ts
import type { HeatmapCell, HourlyBucket, InputRecordEvent } from "../../contracts/src/index";

const usableEvent = (e: InputRecordEvent): boolean =>
  !e.isDeleted && !e.isFiltered && e.normalizedText.trim().length > 0;

const toHour = (iso: string): number => new Date(iso).getHours();
const twoHourBucket = (hour: number): string => {
  const start = String(Math.floor(hour / 2) * 2).padStart(2, "0");
  const end = String(Math.floor(hour / 2) * 2 + 1).padStart(2, "0");
  return `${start}:00-${end}:59`;
};

export const buildTimeActivity = (events: InputRecordEvent[]): { hourlyBuckets: HourlyBucket[]; heatmap: HeatmapCell[] } => {
  const hourlyBuckets: HourlyBucket[] = Array.from({ length: 24 }, (_, hour) => ({ hour, chars: 0, entries: 0 }));
  const heatmapMap = new Map<string, number>();

  for (const event of events) {
    if (!usableEvent(event)) continue;

    const hour = toHour(event.occurredAt);
    hourlyBuckets[hour].chars += event.charCount;
    hourlyBuckets[hour].entries += 1;

    const label = twoHourBucket(hour);
    const key = `${event.dateKey}|${label}`;
    heatmapMap.set(key, (heatmapMap.get(key) ?? 0) + event.charCount);
  }

  const heatmap: HeatmapCell[] = [...heatmapMap.entries()]
    .map(([key, chars]) => {
      const [dateKey, bucketLabel] = key.split("|");
      return { dateKey, bucketLabel, chars };
    })
    .sort((a, b) => `${a.dateKey}${a.bucketLabel}`.localeCompare(`${b.dateKey}${b.bucketLabel}`));

  return { hourlyBuckets, heatmap };
};
```

```ts
import type { InputSession, SessionSummary } from "../../contracts/src/index";

export const summarizeSessions = (sessions: InputSession[]): SessionSummary => {
  if (sessions.length === 0) {
    return {
      count: 0,
      averageDurationSeconds: 0,
      longestDurationSeconds: 0,
      focusSessionCount: 0
    };
  }

  const totalDuration = sessions.reduce((sum, item) => sum + item.durationSeconds, 0);
  const longestDurationSeconds = sessions.reduce(
    (max, item) => Math.max(max, item.durationSeconds),
    0
  );
  const focusSessionCount = sessions.filter((item) => item.intensity === "deep-focus").length;

  return {
    count: sessions.length,
    averageDurationSeconds: Math.round(totalDuration / sessions.length),
    longestDurationSeconds,
    focusSessionCount
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/agentB.time-session.test.ts`
Expected: PASS with 2 passed tests

- [ ] **Step 5: Commit**

```bash
git add tests/agentB.time-session.test.ts packages/analytics/src/time-activity-analysis.ts packages/analytics/src/session-analysis.ts packages/analytics/src/index.ts
git commit -m "feat: add Agent B time and session analysis modules"
```

---

### Task 5: Compose Analytics Service + Summary Generator

**Files:**
- Create: `packages/analytics/src/summary-generator.ts`
- Modify: `packages/analytics/src/index.ts`
- Create: `tests/agentB.services.integration.test.ts`

- [ ] **Step 1: Write failing integration test for composed analytics output**

```ts
import { describe, expect, it } from "vitest";
import { fixtureScenarioMap } from "../packages/mock-data/src/index";
import { analyzeScenario } from "../packages/analytics/src/index";

describe("agent B analytics composition", () => {
  it("produces page-facing analysis slices from scenario records", () => {
    const scenario = fixtureScenarioMap.get("normal-day")!;

    const result = analyzeScenario({
      scenario,
      preset: "last-7-days",
      nowIso: "2026-03-30T23:59:59+08:00"
    });

    expect(result.stats.metrics.length).toBeGreaterThan(0);
    expect(result.vocabulary.topTerms.length).toBeGreaterThan(0);
    expect(result.timeActivity.hourlyBuckets.length).toBe(24);
    expect(result.sessionSummary.count).toBeGreaterThan(0);
    expect(result.highlights.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/agentB.services.integration.test.ts`
Expected: FAIL with missing export `analyzeScenario`

- [ ] **Step 3: Implement summary generator and composed API**

```ts
import type { SessionSummary, VocabularyInsight } from "../../contracts/src/index";

export const generateHighlights = (input: {
  totalChars: number;
  topTerms: VocabularyInsight[];
  sessionSummary: SessionSummary;
}): string[] => {
  const highlights: string[] = [];

  highlights.push(`当前范围输入 ${input.totalChars} 字`);

  if (input.topTerms[0]) {
    highlights.push(`高频词第 1 位：${input.topTerms[0].term}（${input.topTerms[0].count} 次）`);
  }

  highlights.push(`会话 ${input.sessionSummary.count} 次，最长 ${input.sessionSummary.longestDurationSeconds} 秒`);

  return highlights;
};

export const generateReportSummary = (highlights: string[]): string =>
  highlights.slice(0, 3).join("；");
```

```ts
import type { FixtureScenario, TimeRangePreset } from "../../contracts/src/index";
import { buildPreviousRange, filterRecordsByResolvedRange, filterSessionsByResolvedRange, resolveRangeFromQuery } from "./range-filter";
import { summarizeSessions } from "./session-analysis";
import { aggregateStatsSnapshot } from "./stats-aggregation";
import { buildTimeActivity } from "./time-activity-analysis";
import { analyzeVocabulary } from "./vocabulary-analysis";
import { generateHighlights, generateReportSummary } from "./summary-generator";

export const analyzeScenario = (input: {
  scenario: FixtureScenario;
  preset: TimeRangePreset;
  nowIso?: string;
}) => {
  const nowIso = input.nowIso ?? new Date().toISOString();

  const range = resolveRangeFromQuery(
    { ...input.scenario.range, preset: input.preset },
    nowIso
  );
  const previousRange = buildPreviousRange(range);

  const currentEvents = filterRecordsByResolvedRange(input.scenario.records, range);
  const previousEvents = filterRecordsByResolvedRange(input.scenario.records, previousRange);
  const currentSessions = filterSessionsByResolvedRange(input.scenario.sessions, range);

  const sessionSummary = summarizeSessions(currentSessions);
  const stats = aggregateStatsSnapshot({
    range,
    events: currentEvents,
    previousEvents,
    sessionSummary
  });

  const vocabulary = analyzeVocabulary({
    currentEvents,
    previousEvents,
    stopWords: input.scenario.settings.stopWords
  });

  const timeActivity = buildTimeActivity(currentEvents);

  const totalChars = currentEvents.reduce((sum, e) => sum + e.charCount, 0);
  const highlights = generateHighlights({
    totalChars,
    topTerms: vocabulary.topTerms,
    sessionSummary
  });

  return {
    range,
    previousRange,
    stats: {
      ...stats,
      hourlyBuckets: timeActivity.hourlyBuckets,
      heatmap: timeActivity.heatmap,
      highlights
    },
    vocabulary,
    timeActivity,
    sessionSummary,
    highlights,
    reportSummary: generateReportSummary(highlights)
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/agentB.services.integration.test.ts`
Expected: PASS with composed output assertions passing

- [ ] **Step 5: Commit**

```bash
git add tests/agentB.services.integration.test.ts packages/analytics/src/index.ts packages/analytics/src/summary-generator.ts
git commit -m "feat: compose Agent B analytics pipeline"
```

---

### Task 6: Wire Services To Analytics Engine + Preserve Contract Output

**Files:**
- Modify: `packages/services/src/index.ts`
- Modify: `tests/agent0.fixtures.test.ts`
- Modify: `tests/agentB.services.integration.test.ts`

- [ ] **Step 1: Write/extend failing service-level test for bootstrap contract consistency**

```ts
import { describe, expect, it } from "vitest";
import { createServiceRegistry } from "../packages/services/src/index";

describe("agent B service wiring", () => {
  it("returns analytics-driven bootstrap while preserving contract shape", async () => {
    const services = createServiceRegistry();

    const bootstrap = await services.dashboard.getDashboardBootstrap({
      preset: "today",
      scenarioId: "normal-day"
    });

    expect(bootstrap.overview.range.preset).toBe("today");
    expect(bootstrap.overview.metrics.length).toBeGreaterThan(0);
    expect(bootstrap.vocabulary.topTerms.length).toBeGreaterThan(0);
    expect(bootstrap.timeActivity.hourlyBuckets.length).toBe(24);
    expect(bootstrap.overview.highlights[0]).toContain("当前范围输入");
    expect(typeof bootstrap.report.summary).toBe("string");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/agentB.services.integration.test.ts`
Expected: FAIL because `overview.highlights[0]` still comes from fixture text, not analytics-generated summary

- [ ] **Step 3: Replace service stub internals with analytics pipeline**

```ts
import type { DashboardBootstrap, DashboardQuery, FixtureScenario, ViewState } from "../../contracts/src/index";
import { fixtureScenarioMap, fixtureScenarios } from "../../mock-data/src/index";
import { analyzeScenario } from "../../analytics/src/index";

const defaultScenarioId = "normal-day";

const resolveScenario = (scenarioId: string): FixtureScenario =>
  fixtureScenarioMap.get(scenarioId) ?? fixtureScenarioMap.get(defaultScenarioId)!;

const toEmptyResultState = (): ViewState => ({
  code: "EMPTY_RESULT",
  title: "过滤后无可展示结果",
  description: "当前筛选范围有记录，但均被过滤或删除。"
});

export const createServiceRegistry = () => ({
  meta: {
    async listFixtureScenarios(): Promise<string[]> {
      return fixtureScenarios.map((scenario) => scenario.id);
    }
  },
  dashboard: {
    async getDashboardBootstrap(query: DashboardQuery): Promise<DashboardBootstrap> {
      const scenario = resolveScenario(query.scenarioId);
      const analyzed = analyzeScenario({
        scenario,
        preset: query.preset
      });

      const hasRawRecords = scenario.records.length > 0;
      const hasUsableRecords = analyzed.stats.metrics.some(
        (item) => item.key === "input-entries" && Number(item.value) > 0
      );

      const viewState =
        scenario.viewState.code === "NO_DATA"
          ? scenario.viewState
          : hasRawRecords && !hasUsableRecords
            ? toEmptyResultState()
            : scenario.viewState;

      return {
        scenarioId: scenario.id,
        overview: {
          range: analyzed.range,
          viewState,
          metrics: analyzed.stats.metrics,
          highlights: analyzed.highlights
        },
        vocabulary: {
          range: analyzed.range,
          viewState,
          topTerms: analyzed.vocabulary.topTerms,
          newTerms: analyzed.vocabulary.newTerms,
          risingTerms: analyzed.vocabulary.risingTerms
        },
        timeActivity: {
          range: analyzed.range,
          viewState,
          hourlyBuckets: analyzed.stats.hourlyBuckets,
          heatmap: analyzed.stats.heatmap,
          sessions: analyzed.sessionSummary
        },
        governance: {
          settings: scenario.settings,
          lastOperation: scenario.lastOperation,
          viewState
        },
        report: {
          ...scenario.report,
          range: analyzed.range,
          summary: analyzed.reportSummary
        }
      };
    }
  }
});
```

- [ ] **Step 4: Run target tests and verify pass**

Run: `npm test -- tests/agent0.fixtures.test.ts tests/agentB.services.integration.test.ts`
Expected: PASS with existing Agent 0 assertions still green and new Agent B integration green

- [ ] **Step 5: Commit**

```bash
git add packages/services/src/index.ts tests/agent0.fixtures.test.ts tests/agentB.services.integration.test.ts
git commit -m "feat: wire services to Agent B analytics engine"
```

---

### Task 7: Deliver Agent B Docs + Full Verification

**Files:**
- Create: `docs/contracts/agent-b-sample-io.md`
- Create: `docs/architecture/agent-b-edge-cases.md`
- Modify: `README.md`

- [ ] **Step 1: Write sample I/O contract doc with concrete values**

```md
# Agent B Sample Input / Output

## Input (records)
- 2026-03-30T09:12:00+08:00 "输入分析"
- 2026-03-30T22:28:00+08:00 "词库迁移"

## Output (overview metrics)
- input-chars: 53
- input-entries: 4
- active-days: 1
- streak-days: 1

## Output (vocabulary)
- top[0]: 输入分析 (count=2)
- new[0]: 共享契约 (count=1)
- rising[0]: 词库迁移 (delta=+1)
```

- [ ] **Step 2: Write edge-case doc with explicit expected behavior**

```md
# Agent B Edge Cases

1. 空数据：返回 NO_DATA，metrics 为 0，timeline/heatmap 为空。
2. 过滤后无结果：返回 EMPTY_RESULT，原始记录可存在但可用统计为 0。
3. 跨日会话：按 startedAt 所在日纳入会话统计；事件按 occurredAt 分配。
4. 停用词污染：停用词与纯符号不进入 vocabulary insight。
5. 自定义时间范围：仅当 startAt/endAt 同时存在时接受 custom。
```

- [ ] **Step 3: Update README commands and module note**

```md
## Agent B analytics

- Analytics engine source: `packages/analytics/src/*`
- Integration entry: `packages/services/src/index.ts`
- Verification:
  - `npm test`
  - `npm run build`
  - `npm run demo`
```

- [ ] **Step 4: Run full verification suite**

Run: `npm test && npm run build && npm run demo`
Expected: all commands succeed; demo prints scenarioId, overview metrics, top terms, reportTitle

- [ ] **Step 5: Commit**

```bash
git add docs/contracts/agent-b-sample-io.md docs/architecture/agent-b-edge-cases.md README.md
git commit -m "docs: add Agent B analysis engine docs and verification notes"
```

---

## Spec Coverage Self-Check

- 基础统计（日/周/月聚合、累计、活跃、连续活跃）：Task 2
- 词汇分析（高频词/短语/新词/热词变化）：Task 3
- 时间分析（24 小时分布、热力图）：Task 4
- 会话分析（数量、平均、最长、深度会话）：Task 4
- 摘要字段（highlights + report summary）：Task 5
- 服务层直接消费输出：Task 6
- 样例输入输出与边界说明：Task 7

No gaps found against approved spec.
