import { describe, expect, it } from "vitest";

import { createServiceRegistry } from "../packages/services/src/index";

describe("agent 0 fixtures and service stubs", () => {
  it("covers empty, normal, busy and filtered scenarios", async () => {
    const services = createServiceRegistry();
    const scenarios = await services.meta.listFixtureScenarios();

    expect(scenarios).toEqual(
      expect.arrayContaining([
        "empty-history",
        "normal-day",
        "power-user-day",
        "filtered-day"
      ])
    );
  });

  it("exposes page-facing bootstrap data with stable sections", async () => {
    const services = createServiceRegistry();
    const bootstrap = await services.dashboard.getDashboardBootstrap({
      preset: "last-7-days",
      scenarioId: "normal-day"
    });

    expect(bootstrap.overview.metrics.length).toBeGreaterThan(0);
    expect(bootstrap.vocabulary.topTerms.length).toBeGreaterThan(0);
    expect(bootstrap.timeActivity.hourlyBuckets.length).toBe(24);
  });
});
