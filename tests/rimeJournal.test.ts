import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildEventsReport,
  buildWordCloudReport,
  formatEventsMarkdown,
  formatWordCloudMarkdown,
  readJournalEntries,
  resolveJournalRange,
  toRawInputRecords
} from "../packages/rime-journal/src/index";

const tempRoots: string[] = [];

const makeRoot = (): { root: string; rawDir: string } => {
  const root = mkdtempSync(join(tmpdir(), "rime-journal-"));
  const rawDir = join(root, "raw");
  mkdirSync(rawDir, { recursive: true });
  tempRoots.push(root);

  return { root, rawDir };
};

const writeJsonl = (
  rawDir: string,
  dateKey: string,
  records: Array<Record<string, unknown> | string>
): void => {
  const content = records
    .map((record) => (typeof record === "string" ? record : JSON.stringify(record)))
    .join("\n");

  writeFileSync(join(rawDir, `${dateKey}.jsonl`), `${content}\n`, "utf8");
};

const commit = (
  dateKey: string,
  time: string,
  text: string,
  inputCode: string
): Record<string, unknown> => ({
  schemaVersion: "1.0",
  occurredAt: `${dateKey}T${time}+08:00`,
  dateKey,
  source: "rime",
  schemaId: "rime_ice",
  text,
  inputCode,
  textLanguage: /[A-Za-z]/.test(text) && /\p{Script=Han}/u.test(text)
    ? "mixed"
    : /\p{Script=Han}/u.test(text)
      ? "zh-CN"
      : "en-US",
  charCount: [...text].length
});

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("rime journal parser", () => {
  it("uses the reporting timezone for presets even when now is UTC", () => {
    const range = resolveJournalRange({ preset: "today", nowIso: "2026-06-07T18:00:00Z" });
    expect(range.startAt).toBe("2026-06-08T00:00:00+08:00");
    expect(range.endAt).toBe("2026-06-08T23:59:59+08:00");
  });
  it("reads valid JSONL entries and reports malformed lines", () => {
    const { rawDir } = makeRoot();
    writeJsonl(rawDir, "2026-06-08", [
      commit("2026-06-08", "09:00:00", "输入分析", "shu ru fen xi"),
      "{not json}"
    ]);

    const result = readJournalEntries({ rawDir, strict: false });
    const records = toRawInputRecords(result.entries);

    expect(result.entries).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.lineNumber).toBe(2);
    expect(records[0]).toMatchObject({
      appId: "rime.fcitx5",
      appName: "Rime rime_ice",
      text: "输入分析",
      source: "rime"
    });
  });

  it("builds a daily word cloud from final committed text", () => {
    const { rawDir } = makeRoot();
    writeJsonl(rawDir, "2026-06-07", [
      commit("2026-06-07", "20:00:00", "昨日复盘", "zuo ri fu pan")
    ]);
    writeJsonl(rawDir, "2026-06-08", [
      commit("2026-06-08", "09:00:00", "输入分析 输入分析 报告", "shu ru fen xi bao gao"),
      commit("2026-06-08", "10:00:00", "Rime English test", "rime english test")
    ]);

    const report = buildWordCloudReport({
      rawDir,
      date: "2026-06-08",
      limit: 10
    });
    const markdown = formatWordCloudMarkdown(report);

    expect(report.totals.commits).toBe(2);
    expect(report.wordCloud.map((point) => point.term)).toContain("输入分析");
    expect(markdown).toContain("# Rime Input Word Cloud");
    expect(markdown).toContain("输入分析");
  });

  it("builds an ISO-week word cloud and event listing", () => {
    const { rawDir } = makeRoot();
    writeJsonl(rawDir, "2026-06-02", [
      commit("2026-06-02", "09:00:00", "旧周主题", "jiu zhou zhu ti")
    ]);
    writeJsonl(rawDir, "2026-06-08", [
      commit("2026-06-08", "09:00:00", "项目复盘 项目复盘", "xiang mu fu pan")
    ]);
    writeJsonl(rawDir, "2026-06-10", [
      commit("2026-06-10", "11:00:00", "每周词云", "mei zhou ci yun")
    ]);

    const wordCloud = buildWordCloudReport({
      rawDir,
      week: "2026-W24",
      limit: 10
    });
    const events = buildEventsReport({
      rawDir,
      date: "2026-06-08"
    });
    const eventsMarkdown = formatEventsMarkdown(events);

    expect(wordCloud.range.startAt).toBe("2026-06-08T00:00:00+08:00");
    expect(wordCloud.range.endAt).toBe("2026-06-14T23:59:59+08:00");
    expect(wordCloud.totals.commits).toBe(2);
    expect(wordCloud.wordCloud.map((point) => point.term)).toContain("项目复盘");
    expect(events.entries).toHaveLength(1);
    expect(eventsMarkdown).toContain("项目复盘 项目复盘");
  });
});
