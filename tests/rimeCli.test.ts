import { spawnSync } from "node:child_process";
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const cli = (...args: string[]) => spawnSync(process.execPath,
  ["--import", "tsx", "apps/rime-journal/src/index.ts", ...args], { encoding: "utf8" });

describe("journal command line", () => {
  it("initializes the explicit raw directory", () => {
    const root = mkdtempSync(join(tmpdir(), "rime-init-"));
    try {
      const rawDir = join(root, "logs");
      const result = cli("init", "--raw-dir", rawDir);
      expect(result.status).toBe(0);
      expect(existsSync(rawDir)).toBe(true);
      expect(result.stdout).toContain(rawDir);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("prints help successfully", () => {
    const result = cli("--help");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("--start-at");
  });
  it("reads the bundled synthetic journal as clean JSON", () => {
    const result = cli("events", "--raw-dir", "examples/journal/raw", "--date", "2026-06-08", "--format", "json");
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).entries).toHaveLength(2);
  });
  it.each([
    ["--limit", "-1"], ["--limit", "no"], ["--date", "2026-02-30"],
    ["--now", "invalid"], ["--start-at", "invalid", "--end-at", "invalid"],
    ["--date", "2026-06-08", "--week", "2026-W24"]
  ])("rejects invalid selection %j", (...args) => {
    const result = cli("events", ...args);
    expect(result.status).toBe(1);
    expect(result.stderr.length).toBeGreaterThan(0);
  });
});
