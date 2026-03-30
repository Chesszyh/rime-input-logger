import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const repoRoot = new URL("..", import.meta.url).pathname;

const runDemo = (args: string[]): Record<string, unknown> => {
  const output = execFileSync(
    "npm",
    ["--silent", "run", "demo", "--", ...args],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  return JSON.parse(output.trim());
};

describe("agent G integration and release packaging", () => {
  it("supports a CLI-driven demo flow for normal-day and empty-history", () => {
    const normal = runDemo(["--scenario", "normal-day", "--preset", "last-7-days"]);
    const empty = runDemo(["--scenario", "empty-history", "--preset", "today"]);

    expect(normal.scenarioId).toBe("normal-day");
    expect(normal.demoConfig).toMatchObject({
      scenarioId: "normal-day",
      preset: "last-7-days"
    });
    expect((normal.navigation as Array<{ key: string }>).map((item) => item.key)).toEqual([
      "overview",
      "stats",
      "vocabulary",
      "time",
      "report"
    ]);

    expect(empty.scenarioId).toBe("empty-history");
    expect((empty.overview as { state: { code: string } }).state.code).toBe("NO_DATA");
  });

  it("declares agent G scripts and documents the operator path", () => {
    const packageJson = JSON.parse(readFileSync(`${repoRoot}/package.json`, "utf8"));
    const readme = readFileSync(`${repoRoot}/README.md`, "utf8");

    expect(packageJson.scripts["demo:empty"]).toBeDefined();
    expect(packageJson.scripts["release:check"]).toBeDefined();
    expect(readme).toContain("Agent G delivery");
    expect(readme).toContain("npm run release:check");
  });

  it("ships the integration, release, and demo runbook docs", () => {
    expect(existsSync(`${repoRoot}/docs/demo/demo-playbook.md`)).toBe(true);
    expect(existsSync(`${repoRoot}/docs/release/release-guide.md`)).toBe(true);
    expect(existsSync(`${repoRoot}/docs/integration/agent-g-integration-log.md`)).toBe(true);
  });
});
