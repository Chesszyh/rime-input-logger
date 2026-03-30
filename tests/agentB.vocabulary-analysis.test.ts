import { describe, expect, it } from "vitest";

import type { InputRecordEvent } from "../packages/contracts/src/index";
import { analyzeVocabulary } from "../packages/analytics/src/vocabulary-analysis";

const timezone = "Asia/Shanghai";

const makeEvent = (
  id: string,
  text: string,
  at: string,
  options: Partial<Pick<InputRecordEvent, "isFiltered" | "isDeleted">> = {}
): InputRecordEvent => ({
  id,
  occurredAt: at,
  dateKey: at.slice(0, 10),
  timezone,
  schemaVersion: "1.0",
  source: "mock",
  appId: "app",
  appName: "App",
  scope: options.isFiltered ? "ignored" : "allow",
  sessionId: null,
  rawText: null,
  maskedText: text,
  normalizedText: text,
  textLanguage: "zh-CN",
  charCount: text.length,
  tokenCount: 1,
  candidateIndex: 1,
  isDeleted: options.isDeleted ?? false,
  isFiltered: options.isFiltered ?? false,
  filterReasons: options.isFiltered ? ["manual-ignore"] : [],
  tags: []
});

describe("agent B vocabulary analysis", () => {
  it("returns top/new/rising/falling/phrase term insights", () => {
    const current = [
      makeEvent("c1", "输入分析 输入分析 词库迁移", "2026-03-30T10:00:00+08:00"),
      makeEvent("c2", "共享契约 输入分析", "2026-03-30T12:00:00+08:00"),
      makeEvent("c3", "过滤词", "2026-03-30T12:10:00+08:00", { isFiltered: true })
    ];
    const previous = [
      makeEvent("p1", "输入分析", "2026-03-23T10:00:00+08:00"),
      makeEvent("p2", "旧词 旧词", "2026-03-23T11:00:00+08:00")
    ];

    const result = analyzeVocabulary({
      currentEvents: current,
      previousEvents: previous,
      stopWords: ["的", "了", "是"]
    });

    expect(result.topTerms[0]?.term).toBe("输入分析");
    expect(result.newTerms.map((item) => item.term)).toEqual(
      expect.arrayContaining(["共享契约", "词库迁移"])
    );
    expect(result.risingTerms.map((item) => item.term)).toContain("输入分析");
    expect(result.fallingTerms.map((item) => item.term)).toContain("旧词");
    expect(result.phraseTerms.length).toBeGreaterThan(0);
  });

  it("filters stop words, short noise and symbol-only terms", () => {
    const result = analyzeVocabulary({
      currentEvents: [makeEvent("c1", "的 了 # a", "2026-03-30T10:00:00+08:00")],
      previousEvents: [],
      stopWords: ["的", "了"]
    });

    expect(result.topTerms.length).toBe(0);
    expect(result.newTerms.length).toBe(0);
    expect(result.phraseTerms.length).toBe(0);
  });
});
