import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("agent 0 contract coverage", () => {
  it("defines the core entity types required by the prompt", () => {
    const content = readFileSync("packages/contracts/src/index.ts", "utf8");

    expect(content).toContain("export interface InputRecordEvent");
    expect(content).toContain("export interface InputSession");
    expect(content).toContain("export interface StatsSnapshot");
    expect(content).toContain("export interface VocabularyInsight");
    expect(content).toContain("export interface LexiconEntry");
    expect(content).toContain("export interface AnalyticsReport");
    expect(content).toContain("export interface UserSettings");
    expect(content).toContain("export interface OperationEnvelope");
    expect(content).toContain("export interface ViewState");
  });

  it("documents the shared error, empty and permission states", () => {
    const content = readFileSync("packages/contracts/src/index.ts", "utf8");

    expect(content).toContain("NO_DATA");
    expect(content).toContain("EMPTY_RESULT");
    expect(content).toContain("PERMISSION_DENIED");
    expect(content).toContain("PAUSED");
  });
});
