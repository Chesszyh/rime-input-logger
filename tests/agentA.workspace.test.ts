import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("agent A workspace deliverables", () => {
  it("ships the ingestion module", () => {
    expect(existsSync("packages/services/src/ingestion.ts")).toBe(true);
  });

  it("exposes ingestion pipeline read interfaces", () => {
    const content = readFileSync("packages/services/src/ingestion.ts", "utf8");

    expect(content).toContain("export const processRawRecords");
    expect(content).toContain("export const readEvents");
    expect(content).toContain("export const readSessions");
    expect(content).toContain("export const getRepresentativeOutputs");
  });
});
