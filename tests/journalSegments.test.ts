import { describe, expect, it } from "vitest";
import { groupJournalEntries } from "../packages/rime-journal/src/segments";
import type { RimeCommitJournalEntry } from "../packages/rime-journal/src/index";
const entry = (
  text: string,
  seconds: number,
  schemaId = "demo",
): RimeCommitJournalEntry => ({
  schemaVersion: "1.0",
  source: "rime",
  dateKey: "2026-06-08",
  occurredAt: `2026-06-08T12:00:${String(seconds).padStart(2, "0")}+08:00`,
  text,
  charCount: [...text].length,
  schemaId,
  textLanguage: "zh-CN",
});
describe("continuous journal segments", () => {
  it("joins commits without rewriting text and retains original events", () => {
    const entries = [
      entry("今天", 0),
      entry("写文档", 3),
      entry("。", 4),
      entry("下一句", 5),
    ];
    const result = groupJournalEntries(entries);
    expect(result.map((item) => item.text)).toEqual(["今天写文档。", "下一句"]);
    expect(result[0].entries).toEqual(entries.slice(0, 3));
    expect(entries[0].text).toBe("今天");
  });
  it("splits pauses and schema changes and accepts a different threshold", () => {
    const entries = [
      entry("开始", 0),
      entry("继续", 20),
      entry("切换", 21, "another"),
    ];
    expect(groupJournalEntries(entries)).toHaveLength(3);
    expect(groupJournalEntries(entries, 30)).toHaveLength(2);
  });
  it("breaks at focus and edit boundaries even within the same second", () => {
    const base = { sessionId: "session", focusId: "field-a", boundaryId: "1" };
    const events = [
      { ...entry("你好", 1), ...base },
      { ...entry("world", 1), ...base, observed: true },
      { ...entry("新字段", 1), ...base, focusId: "field-b" },
      { ...entry("编辑后", 1), ...base, focusId: "field-b", boundaryId: "2" },
    ];
    const groups = groupJournalEntries(events);
    expect(groups.map((item) => item.text)).toEqual([
      "你好world",
      "新字段",
      "编辑后",
    ]);
    expect(groups[0].entries[1].observed).toBe(true);
  });
});
