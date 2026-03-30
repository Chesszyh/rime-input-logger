import { describe, expect, it } from "vitest";

import type {
  InputRecordEvent,
  SessionSummary,
  TimeRange
} from "../packages/contracts/src/index";
import {
  aggregateStatsSnapshot,
  buildTimelineByGranularity
} from "../packages/analytics/src/stats-aggregation";

const timezone = "Asia/Shanghai";

const range: TimeRange = {
  preset: "last-7-days",
  label: "近7天",
  timezone,
  startAt: "2026-03-24T00:00:00+08:00",
  endAt: "2026-03-30T23:59:59+08:00"
};

const zeroSessions: SessionSummary = {
  count: 0,
  averageDurationSeconds: 0,
  longestDurationSeconds: 0,
  focusSessionCount: 0
};

const makeEvent = (
  id: string,
  occurredAt: string,
  charCount: number,
  tokenCount: number,
  isFiltered = false
): InputRecordEvent => ({
  id,
  occurredAt,
  dateKey: occurredAt.slice(0, 10),
  timezone,
  schemaVersion: "1.0",
  source: "mock",
  appId: "app",
  appName: "App",
  scope: isFiltered ? "ignored" : "allow",
  sessionId: null,
  rawText: null,
  maskedText: "text",
  normalizedText: isFiltered ? "" : "text",
  textLanguage: "en-US",
  charCount,
  tokenCount,
  candidateIndex: 1,
  isDeleted: false,
  isFiltered,
  filterReasons: isFiltered ? ["stop-word"] : [],
  tags: []
});

const getNumericMetric = (
  metrics: Array<{ key: string; value: number | string }>,
  key: string
): number => {
  const metric = metrics.find((item) => item.key === key);

  return typeof metric?.value === "number" ? metric.value : 0;
};

describe("agent B stats aggregation", () => {
  it("aggregates core metrics and builds a day timeline for the full range", () => {
    const result = aggregateStatsSnapshot({
      range,
      events: [
        makeEvent("e1", "2026-03-29T10:00:00+08:00", 10, 2),
        makeEvent("e2", "2026-03-30T11:00:00+08:00", 20, 4),
        makeEvent("e3", "2026-03-30T12:00:00+08:00", 30, 6, true)
      ],
      previousEvents: [makeEvent("p1", "2026-03-22T11:00:00+08:00", 15, 3)],
      sessionSummary: {
        count: 2,
        averageDurationSeconds: 900,
        longestDurationSeconds: 1200,
        focusSessionCount: 1
      }
    });

    expect(getNumericMetric(result.metrics, "input-chars")).toBe(30);
    expect(getNumericMetric(result.metrics, "input-entries")).toBe(2);
    expect(getNumericMetric(result.metrics, "active-days")).toBe(2);
    expect(getNumericMetric(result.metrics, "streak-days")).toBe(2);

    expect(result.timeline.length).toBe(7);
    expect(result.timeline[0]?.bucket).toBe("2026-03-24");
    expect(result.timeline[6]?.bucket).toBe("2026-03-30");
    expect(result.timeline[6]?.chars).toBe(20);
  });

  it("supports day, week and month helper aggregation", () => {
    const events = [
      makeEvent("e1", "2026-03-24T10:00:00+08:00", 5, 1),
      makeEvent("e2", "2026-03-30T11:00:00+08:00", 7, 2),
      makeEvent("e3", "2026-04-02T09:00:00+08:00", 9, 2)
    ];

    const day = buildTimelineByGranularity(events, "day");
    const week = buildTimelineByGranularity(events, "week");
    const month = buildTimelineByGranularity(events, "month");

    expect(day.length).toBe(3);
    expect(week.length).toBe(2);
    expect(month.length).toBe(2);
  });

  it("returns stable zeroed metrics for empty input", () => {
    const result = aggregateStatsSnapshot({
      range,
      events: [],
      previousEvents: [],
      sessionSummary: zeroSessions
    });

    expect(getNumericMetric(result.metrics, "input-chars")).toBe(0);
    expect(getNumericMetric(result.metrics, "input-entries")).toBe(0);
    expect(getNumericMetric(result.metrics, "active-days")).toBe(0);
    expect(getNumericMetric(result.metrics, "streak-days")).toBe(0);
    expect(result.timeline.length).toBe(7);
    expect(result.timeline.every((point) => point.chars === 0)).toBe(true);
  });
});
