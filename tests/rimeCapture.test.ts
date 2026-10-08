import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildEventsReport, buildWordCloudReport, readJournalEntries } from "../packages/rime-journal/src/index";

describe("Rime Lua capture contract", () => {
  it("writes parseable commits consumed by the journal reports", () => {
    const root = mkdtempSync(join(tmpdir(), "rime-capture-"));
    const { RIME_COMMIT_LOG_ROOT: _root, RIME_COMMIT_LOG_DEBUG: _debug, ...env } = process.env;
    try {
      execFileSync("lua", ["tests/lua/capture.lua", root], { env });
      const { entries } = readJournalEntries({ root });
      expect(entries).toHaveLength(3);
      expect(entries[0]).toMatchObject({
        text: '输入分析 "Rime"\n第二行\t\\😀', inputCode: "shu ru", textLanguage: "mixed", charCount: 18
      });
      expect(entries[1]).toMatchObject({ text: "报告", textLanguage: "zh-CN", charCount: 2 });
      expect(entries[1]?.inputCode).toBeUndefined();
      expect(entries[2]?.inputCode).not.toBe("cancelled");
      expect(buildEventsReport({ root, preset: "all-time" }).entries).toHaveLength(3);
      expect(buildWordCloudReport({ root, preset: "all-time" }).totals.commits).toBe(3);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
