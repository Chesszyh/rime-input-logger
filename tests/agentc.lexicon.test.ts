import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { createServiceRegistry } from "../packages/services/src/index";

describe("agent c lexicon management", () => {
  it("exposes lexicon management contract types", () => {
    const content = readFileSync("packages/contracts/src/index.ts", "utf8");

    expect(content).toContain("export interface LexiconOverview");
    expect(content).toContain("export interface LexiconQuery");
    expect(content).toContain("export interface LexiconExportRequest");
    expect(content).toContain("export interface LexiconMutationRequest");
    expect(content).toContain("export interface MigrationGuide");
  });

  it("identifies high-frequency new and low-frequency stale entries", async () => {
    const services = createServiceRegistry();

    const highFrequencyNew = await services.lexicon.identifyHighFrequencyNew({
      scenarioId: "normal-day"
    });
    const lowFrequencyStale = await services.lexicon.identifyLowFrequencyStale({
      scenarioId: "normal-day"
    });

    expect(highFrequencyNew.map((entry) => entry.id)).toEqual(["lex-003"]);
    expect(lowFrequencyStale.map((entry) => entry.id)).toEqual(["lex-004"]);
  });

  it("computes lexicon overview metrics", async () => {
    const services = createServiceRegistry();

    const overview = await services.lexicon.getOverview({
      scenarioId: "normal-day"
    });

    expect(overview).toEqual({
      totalEntries: 6,
      newEntries: 2,
      highFrequencyEntries: 2,
      lowFrequencyStaleEntries: 1,
      phraseEntries: 1,
      favoriteEntries: 1,
      ignoredEntries: 1,
      deletedEntries: 1
    });
  });

  it("supports lexicon filtering, searching and sorting", async () => {
    const services = createServiceRegistry();

    const listed = await services.lexicon.listEntries({
      scenarioId: "normal-day",
      query: {
        category: "high-frequency",
        search: "输入",
        sortBy: "usage-count",
        sortOrder: "desc"
      }
    });

    expect(listed.total).toBeGreaterThan(0);
    expect(listed.entries[0]?.usageCount ?? 0).toBeGreaterThan(0);
  });

  it("supports lexicon mutation actions", async () => {
    const services = createServiceRegistry();

    const listed = await services.lexicon.listEntries({
      scenarioId: "normal-day",
      query: {
        category: "all",
        search: "",
        sortBy: "usage-count",
        sortOrder: "desc"
      }
    });

    const firstId = listed.entries[0]?.id;
    expect(firstId).toBeTruthy();

    const favoriteMutation = await services.lexicon.mutateEntries({
      scenarioId: "normal-day",
      request: {
        action: "favorite",
        entryIds: [firstId!]
      }
    });

    expect(favoriteMutation.updatedCount).toBe(1);
    expect(favoriteMutation.entries[0]?.status).toBe("favorite");

    const unfavoriteMutation = await services.lexicon.mutateEntries({
      scenarioId: "normal-day",
      request: {
        action: "unfavorite",
        entryIds: [firstId!]
      }
    });

    expect(unfavoriteMutation.updatedCount).toBe(1);
    expect(unfavoriteMutation.entries[0]?.status).toBe("active");

    const ignoreMutation = await services.lexicon.mutateEntries({
      scenarioId: "normal-day",
      request: {
        action: "ignore",
        entryIds: ["lex-002"]
      }
    });

    expect(ignoreMutation.updatedCount).toBe(1);
    expect(ignoreMutation.entries[0]?.status).toBe("ignored");

    const unignoreMutation = await services.lexicon.mutateEntries({
      scenarioId: "normal-day",
      request: {
        action: "unignore",
        entryIds: ["lex-002"]
      }
    });

    expect(unignoreMutation.updatedCount).toBe(1);
    expect(unignoreMutation.entries[0]?.status).toBe("active");

    const deleteMutation = await services.lexicon.mutateEntries({
      scenarioId: "normal-day",
      request: {
        action: "delete",
        entryIds: ["lex-001"]
      }
    });

    expect(deleteMutation.updatedCount).toBe(1);
    expect(deleteMutation.entries[0]?.status).toBe("deleted");

    const restoreMutation = await services.lexicon.mutateEntries({
      scenarioId: "normal-day",
      request: {
        action: "restore",
        entryIds: ["lex-001"]
      }
    });

    expect(restoreMutation.updatedCount).toBe(1);
    expect(restoreMutation.entries[0]?.status).toBe("active");

    const setCategoryMutation = await services.lexicon.mutateEntries({
      scenarioId: "normal-day",
      request: {
        action: "set-category",
        entryIds: ["lex-003"],
        category: "noise"
      }
    });

    expect(setCategoryMutation.updatedCount).toBe(1);
    expect(setCategoryMutation.entries[0]?.category).toBe("noise");

    const invalidSetCategoryMutation = await services.lexicon.mutateEntries({
      scenarioId: "normal-day",
      request: {
        action: "set-category",
        entryIds: ["lex-003"]
      }
    });

    expect(invalidSetCategoryMutation.updatedCount).toBe(0);
    expect(invalidSetCategoryMutation.warnings.length).toBeGreaterThan(0);

    const phraseMutation = await services.lexicon.mutateEntries({
      scenarioId: "normal-day",
      request: {
        action: "mark-phrase",
        entryIds: ["lex-003"]
      }
    });

    expect(phraseMutation.updatedCount).toBe(1);
    expect(phraseMutation.entries[0]?.category).toBe("phrase");
  });

  it("persists mutation results in subsequent list queries", async () => {
    const services = createServiceRegistry();

    await services.lexicon.mutateEntries({
      scenarioId: "normal-day",
      request: {
        action: "delete",
        entryIds: ["lex-001"]
      }
    });

    const deleted = await services.lexicon.listEntries({
      scenarioId: "normal-day",
      query: {
        category: "deleted",
        search: "",
        sortBy: "usage-count",
        sortOrder: "desc"
      }
    });

    expect(deleted.entries.some((entry) => entry.id === "lex-001")).toBe(true);
  });

  it("exports selected entries in json, tsv and rime formats", async () => {
    const services = createServiceRegistry();

    const jsonExport = await services.lexicon.exportEntries({
      scenarioId: "normal-day",
      request: {
        format: "json",
        category: "all"
      }
    });
    const tsvExport = await services.lexicon.exportEntries({
      scenarioId: "normal-day",
      request: {
        format: "tsv",
        category: "all"
      }
    });
    const rimeExport = await services.lexicon.exportEntries({
      scenarioId: "normal-day",
      request: {
        format: "rime",
        category: "all"
      }
    });

    expect(jsonExport.format).toBe("json");
    expect(jsonExport.content.trim().startsWith("[")).toBe(true);
    expect(tsvExport.content).toContain("term\tusageCount\tcategory\tstatus");
    expect(rimeExport.content).toContain("# Rime dictionary export");
    expect(rimeExport.content).toContain("# scenario: normal-day");
    expect(rimeExport.content).toContain("# generatedAt:");
    expect(rimeExport.content).toContain("\t");
  });

  it("supports selected-entry export and category-based export", async () => {
    const services = createServiceRegistry();

    const selectedExport = await services.lexicon.exportEntries({
      scenarioId: "normal-day",
      request: {
        format: "tsv",
        category: "all",
        entryIds: ["lex-001", "lex-003"]
      }
    });

    const favoriteExport = await services.lexicon.exportEntries({
      scenarioId: "normal-day",
      request: {
        format: "json",
        category: "favorite"
      }
    });

    expect(selectedExport.exportedCount).toBe(2);
    expect(selectedExport.content).toContain("输入分析");
    expect(selectedExport.content).toContain("词库迁移");
    expect(selectedExport.content).not.toContain("待清理词");

    expect(favoriteExport.exportedCount).toBeGreaterThan(0);
    expect(favoriteExport.content).toContain("共享契约");
  });

  it("returns migration guide for target export format", async () => {
    const services = createServiceRegistry();

    const guide = await services.lexicon.getMigrationGuide({
      scenarioId: "normal-day",
      format: "rime"
    });

    expect(guide.format).toBe("rime");
    expect(guide.steps.length).toBeGreaterThan(0);
  });

  it("keeps empty-history scenario stable", async () => {
    const services = createServiceRegistry();

    const listed = await services.lexicon.listEntries({
      scenarioId: "empty-history",
      query: {
        category: "all",
        search: "",
        sortBy: "usage-count",
        sortOrder: "desc"
      }
    });

    const exported = await services.lexicon.exportEntries({
      scenarioId: "empty-history",
      request: {
        format: "tsv",
        category: "all"
      }
    });

    expect(listed.total).toBe(0);
    expect(exported.exportedCount).toBe(0);
    expect(exported.content).toContain("term\tusageCount\tcategory\tstatus");
  });
});
