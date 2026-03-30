import { describe, expect, it } from "vitest";

import { createServiceRegistry } from "../packages/services/src/index";

describe("agent B service integration", () => {
  it("returns analytics-driven bootstrap while preserving dashboard contract", async () => {
    const services = createServiceRegistry();

    const bootstrap = await services.dashboard.getDashboardBootstrap({
      preset: "today",
      scenarioId: "normal-day"
    });

    expect(bootstrap.overview.range.preset).toBe("today");
    expect(bootstrap.overview.metrics.length).toBeGreaterThan(0);
    expect(bootstrap.overview.timeline.length).toBeGreaterThan(0);
    expect(bootstrap.vocabulary.topTerms.length).toBeGreaterThan(0);
    expect(bootstrap.timeActivity.hourlyBuckets.length).toBe(24);
    expect(typeof bootstrap.report.summary).toBe("string");
    expect(bootstrap.overview.highlights.length).toBeGreaterThan(0);
  });

  it("keeps NO_DATA state for empty-history scenario", async () => {
    const services = createServiceRegistry();

    const bootstrap = await services.dashboard.getDashboardBootstrap({
      preset: "today",
      scenarioId: "empty-history"
    });

    expect(bootstrap.overview.viewState.code).toBe("NO_DATA");
    expect(bootstrap.vocabulary.viewState.code).toBe("NO_DATA");
    expect(bootstrap.timeActivity.viewState.code).toBe("NO_DATA");
  });

  it("returns EMPTY_RESULT when range has no usable records", async () => {
    const services = createServiceRegistry();

    const bootstrap = await services.dashboard.getDashboardBootstrap({
      preset: "yesterday",
      scenarioId: "normal-day"
    });

    expect(bootstrap.overview.viewState.code).toBe("EMPTY_RESULT");
    expect(bootstrap.vocabulary.topTerms.length).toBe(0);
    expect(bootstrap.timeActivity.heatmap.length).toBe(0);
  });

  it("surfaces semantic top terms and full vocabulary slices for dashboard consumers", async () => {
    const services = createServiceRegistry();

    const bootstrap = await services.dashboard.getDashboardBootstrap({
      preset: "last-7-days",
      scenarioId: "normal-day"
    });

    const topTerms = bootstrap.vocabulary.topTerms.map((item) => item.term);
    const phraseTerms = bootstrap.vocabulary.phraseTerms.map((item) => item.term);
    const fallingTerms = bootstrap.vocabulary.fallingTerms.map((item) => item.term);

    expect(topTerms).toEqual(
      expect.arrayContaining(["输入分析", "共享契约", "词库迁移"])
    );
    expect(topTerms).not.toContain("需要");
    expect(
      bootstrap.overview.highlights.some((line) =>
        ["输入分析", "共享契约", "词库迁移"].some((term) => line.includes(term))
      )
    ).toBe(true);
    expect(
      ["输入分析", "共享契约", "词库迁移"].some((term) =>
        bootstrap.report.summary.includes(term)
      )
    ).toBe(true);
    expect(phraseTerms).toEqual(
      expect.arrayContaining(["输入分析", "共享契约", "词库迁移"])
    );
    expect(fallingTerms).toContain("旧版术语");
  });
});
