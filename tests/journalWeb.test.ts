import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readDashboardJournal } from "../apps/web-dashboard/server/journal-api";

describe("journal web data", () => {
  it("loads the bundled example with the same counts as CLI", () => {
    const data = readDashboardJournal(
      new URLSearchParams({ source: "example" }),
    );
    expect(
      data.report.wordCloud.find((point) => point.term === "rime")?.count,
    ).toBe(1);
    expect(
      data.report.wordCloud.find((point) => point.term === "example")?.count,
    ).toBe(1);
    expect(data.date).toBe("2026-06-08");
    expect(data.events.entries).toHaveLength(2);
    expect(
      data.report.wordCloud.find((point) => point.term === "输入分析")?.count,
    ).toBe(2);
  });

  it("returns all daily events beyond the CLI default limit and exposes malformed lines", () => {
    const rawDir = mkdtempSync(join(tmpdir(), "rime-web-"));
    try {
      const lines = Array.from({ length: 205 }, (_, index) =>
        JSON.stringify({
          text: `测试输入 ${index}`,
          occurredAt: "2026-06-08T12:00:00+08:00",
          dateKey: "2026-06-08",
        }),
      );
      writeFileSync(
        join(rawDir, "2026-06-08.jsonl"),
        lines.join("\n") + "\ninvalid\n",
      );
      const data = readDashboardJournal(
        new URLSearchParams({ rawDir, date: "2026-06-08" }),
      );
      expect(data.events.entries).toHaveLength(205);
      expect(data.events.source.parseErrors).toHaveLength(1);
      expect(data.dates).toEqual(["2026-06-08"]);
    } finally {
      rmSync(rawDir, { recursive: true });
    }
  });

  it("supports missing directories and rejects invalid dates", () => {
    const data = readDashboardJournal(
      new URLSearchParams({
        rawDir: "/nonexistent/rime-web-fixture",
        date: "2026-06-08",
      }),
    );
    expect(data.exists).toBe(false);
    expect(data.events.entries).toEqual([]);
    expect(() =>
      readDashboardJournal(
        new URLSearchParams({ source: "example", date: "2026-02-30" }),
      ),
    ).toThrow();
  });
});
