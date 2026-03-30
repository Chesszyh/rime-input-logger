import { describe, expect, it } from "vitest";

import type {
  InputRecordEvent,
  InputSession,
  TimeRange
} from "../packages/contracts/src/index";
import {
  buildPreviousRange,
  filterRecordsByResolvedRange,
  filterSessionsByResolvedRange,
  resolveRangeFromQuery
} from "../packages/analytics/src/range-filter";

const timezone = "Asia/Shanghai";

const makeRange = (preset: TimeRange["preset"]): TimeRange => ({
  preset,
  label: preset,
  timezone
});

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

const makeSession = (
  id: string,
  startedAt: string,
  endedAt: string
): InputSession => ({
  id,
  startedAt,
  endedAt,
  dateKey: startedAt.slice(0, 10),
  timezone,
  eventIds: [],
  totalChars: 12,
  totalTokens: 3,
  durationSeconds: 600,
  idleGapSeconds: 120,
  crossedMidnight: false,
  intensity: "normal"
});

describe("agent B range filtering", () => {
  it("resolves last-7-days boundaries from provided now", () => {
    const resolved = resolveRangeFromQuery(
      makeRange("last-7-days"),
      "2026-03-30T12:00:00+08:00"
    );

    expect(resolved.startAt).toBe("2026-03-24T00:00:00+08:00");
    expect(resolved.endAt).toBe("2026-03-30T23:59:59+08:00");
  });

  it("resolves custom range when startAt and endAt are provided", () => {
    const resolved = resolveRangeFromQuery(
      {
        ...makeRange("custom"),
        startAt: "2026-03-20T00:00:00+08:00",
        endAt: "2026-03-21T23:59:59+08:00"
      },
      "2026-03-30T12:00:00+08:00"
    );

    expect(resolved.startAt).toBe("2026-03-20T00:00:00+08:00");
    expect(resolved.endAt).toBe("2026-03-21T23:59:59+08:00");
  });

  it("filters records and sessions within resolved range", () => {
    const range = resolveRangeFromQuery(
      makeRange("today"),
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

    expect(filterRecordsByResolvedRange(records, range).map((item) => item.id)).toEqual([
      "e1"
    ]);
    expect(filterSessionsByResolvedRange(sessions, range).map((item) => item.id)).toEqual([
      "s1"
    ]);
  });

  it("builds previous window using equal duration", () => {
    const current = resolveRangeFromQuery(
      makeRange("last-7-days"),
      "2026-03-30T08:00:00+08:00"
    );

    const previous = buildPreviousRange(current);

    expect(previous.startAt).toBe("2026-03-17T00:00:00+08:00");
    expect(previous.endAt).toBe("2026-03-23T23:59:59+08:00");
  });
});
