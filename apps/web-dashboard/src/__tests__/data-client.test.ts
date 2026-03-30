import { describe, expect, it } from "vitest";
import { loadDashboardWorkspace } from "../lib/dashboard-client";

describe("dashboard client", () => {
  it("loads dashboard and lexicon data for normal-day", async () => {
    const workspace = await loadDashboardWorkspace({
      scenarioId: "normal-day",
      preset: "last-7-days",
      hideTermsInReport: true,
      forceMaskedContent: true,
      lexiconCategory: "all"
    });

    expect(workspace.dashboard.scenarioId).toBe("normal-day");
    expect(workspace.selection.rangeLabel).toBe("近 7 天");
    expect(workspace.lexicon.overview.totalEntries).toBeGreaterThan(0);
    expect(workspace.lexicon.highFrequencyNew.length).toBeGreaterThan(0);
    expect(workspace.lexicon.lowFrequencyStale.length).toBeGreaterThan(0);
    expect(workspace.lexicon.rimePreview[0]).toBe("# Rime dictionary export");
  });

  it("updates the range label when the preset changes", async () => {
    const workspace = await loadDashboardWorkspace({
      scenarioId: "normal-day",
      preset: "last-30-days",
      hideTermsInReport: true,
      forceMaskedContent: true,
      lexiconCategory: "all"
    });

    expect(workspace.selection.rangeLabel).toBe("近 30 天");
  });
});
