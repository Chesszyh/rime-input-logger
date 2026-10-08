import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("agent 0 workspace baseline", () => {
  it("declares app and package workspaces", () => {
    const rootPackage = JSON.parse(readFileSync("package.json", "utf8"));

    expect(rootPackage.workspaces).toEqual(["apps/*", "packages/*"]);
  });

  it("contains the shared contract and mock-data entrypoints", () => {
    expect(existsSync("packages/contracts/src/index.ts")).toBe(true);
    expect(existsSync("packages/mock-data/src/index.ts")).toBe(true);
    expect(existsSync("packages/services/src/index.ts")).toBe(true);
    expect(existsSync("apps/demo/src/index.ts")).toBe(true);
  });

});
