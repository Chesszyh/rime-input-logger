import { describe, expect, it } from "vitest";

import type { InputRecordEvent, InputSession } from "../packages/contracts/src/index";
import { summarizeSessions } from "../packages/analytics/src/session-analysis";
import { buildTimeActivity } from "../packages/analytics/src/time-activity-analysis";

const timezone = "Asia/Shanghai";

const makeEvent = (
  id: string,
  at: string,
  chars: number,
  isFiltered = false
): InputRecordEvent => ({
  id,
  occurredAt: at,
  dateKey: at.slice(0, 10),
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
  charCount: chars,
  tokenCount: 1,
  candidateIndex: 1,
  isDeleted: false,
  isFiltered,
  filterReasons: isFiltered ? ["noise"] : [],
  tags: []
});

const makeSession = (
  id: string,
  startedAt: string,
  durationSeconds: number,
  intensity: InputSession["intensity"]
): InputSession => ({
  id,
  startedAt,
  endedAt: new Date(new Date(startedAt).getTime() + durationSeconds * 1000).toISOString(),
  dateKey: startedAt.slice(0, 10),
  timezone,
  eventIds: [],
  totalChars: 20,
  totalTokens: 4,
  durationSeconds,
  idleGapSeconds: 60,
  crossedMidnight: false,
  intensity
});

describe("agent B time and session analysis", () => {
  it("builds 24-hour buckets and date-time heatmap cells", () => {
    const result = buildTimeActivity([
      makeEvent("e1", "2026-03-30T09:15:00+08:00", 10),
      makeEvent("e2", "2026-03-30T22:20:00+08:00", 12),
      makeEvent("e3", "2026-03-29T22:10:00+08:00", 6),
      makeEvent("e4", "2026-03-30T22:30:00+08:00", 99, true)
    ]);

    expect(result.hourlyBuckets.length).toBe(24);
    expect(result.hourlyBuckets[9]?.chars).toBe(10);
    expect(result.hourlyBuckets[22]?.chars).toBe(18);
    expect(result.heatmap.length).toBeGreaterThan(0);
    expect(result.heatmap.some((item) => item.bucketLabel === "22:00-23:59")).toBe(true);
  });

  it("summarizes sessions including deep-focus count", () => {
    const summary = summarizeSessions([
      makeSession("s1", "2026-03-30T09:10:00+08:00", 600, "normal"),
      makeSession("s2", "2026-03-30T22:00:00+08:00", 1800, "deep-focus")
    ]);

    expect(summary.count).toBe(2);
    expect(summary.averageDurationSeconds).toBe(1200);
    expect(summary.longestDurationSeconds).toBe(1800);
    expect(summary.focusSessionCount).toBe(1);
  });

  it("returns zero summary for empty sessions", () => {
    const summary = summarizeSessions([]);

    expect(summary.count).toBe(0);
    expect(summary.averageDurationSeconds).toBe(0);
    expect(summary.longestDurationSeconds).toBe(0);
    expect(summary.focusSessionCount).toBe(0);
  });
});
