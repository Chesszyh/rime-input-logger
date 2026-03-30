import { describe, expect, it } from "vitest";

import { buildDashboardExperience, exportReportArtifact } from "../packages/dashboard/src/index";
import { createServiceRegistry } from "../packages/services/src/index";

const assertChartMeta = (chart: {
  title: string;
  rangeLabel: string;
  unit: string;
  description: string;
}) => {
  expect(chart.title.length).toBeGreaterThan(0);
  expect(chart.rangeLabel.length).toBeGreaterThan(0);
  expect(chart.unit.length).toBeGreaterThan(0);
  expect(chart.description.length).toBeGreaterThan(0);
};

describe("agent D dashboard and report delivery", () => {
  it("builds navigation and five page views from normal scenario", async () => {
    const services = createServiceRegistry();
    const bootstrap = await services.dashboard.getDashboardBootstrap({
      preset: "last-7-days",
      scenarioId: "normal-day"
    });

    const experience = buildDashboardExperience(bootstrap);

    expect(experience.navigation.map((item) => item.key)).toEqual([
      "overview",
      "stats",
      "vocabulary",
      "time",
      "report"
    ]);

    expect(experience.pages.overview.metrics.length).toBeGreaterThan(0);
    expect(experience.pages.overview.highlights.length).toBeGreaterThan(0);

    assertChartMeta(experience.pages.stats.trendChart);
    assertChartMeta(experience.pages.stats.volumeChart);
    assertChartMeta(experience.pages.vocabulary.topTermsChart);
    assertChartMeta(experience.pages.vocabulary.changeChart);
    assertChartMeta(experience.pages.vocabulary.wordCloud);
    assertChartMeta(experience.pages.time.hourlyChart);
    assertChartMeta(experience.pages.time.heatmapChart);

    expect(experience.pages.stats.trendChart.points.length).toBe(7);
    expect(experience.pages.time.hourlyChart.points.length).toBe(24);
    expect(
      experience.pages.vocabulary.changeChart.points.some((point) => point.value < 0)
    ).toBe(true);
    expect(
      experience.pages.vocabulary.wordCloud.points.map((point) => point.label)
    ).toEqual(expect.arrayContaining(["输入分析", "共享契约", "词库迁移"]));

    expect(experience.pages.report.exportEntry.formats).toEqual([
      "json",
      "text",
      "html"
    ]);
  });

  it("keeps all pages readable in empty-history scenario", async () => {
    const services = createServiceRegistry();
    const bootstrap = await services.dashboard.getDashboardBootstrap({
      preset: "today",
      scenarioId: "empty-history"
    });

    const experience = buildDashboardExperience(bootstrap);

    expect(experience.pages.overview.state.code).toBe("NO_DATA");
    expect(experience.pages.stats.state.code).toBe("NO_DATA");
    expect(experience.pages.vocabulary.state.code).toBe("NO_DATA");
    expect(experience.pages.time.state.code).toBe("NO_DATA");
    expect(experience.pages.report.state.code).toBe("NO_DATA");

    expect(experience.pages.overview.emptyCopy).toContain("暂无");
    expect(experience.pages.stats.emptyCopy).toContain("暂无");
    expect(experience.pages.vocabulary.emptyCopy).toContain("暂无");
    expect(experience.pages.time.emptyCopy).toContain("暂无");
    expect(experience.pages.report.emptyCopy).toContain("暂无");
  });

  it("builds day/week/month report templates and aligns selected preset", async () => {
    const services = createServiceRegistry();
    const bootstrap = await services.dashboard.getDashboardBootstrap({
      preset: "last-30-days",
      scenarioId: "power-user-day"
    });

    const experience = buildDashboardExperience(bootstrap);

    expect(experience.pages.report.templates.map((item) => item.id)).toEqual([
      "daily",
      "weekly",
      "monthly"
    ]);
    expect(experience.pages.report.selectedTemplate.id).toBe("monthly");
  });

  it("supports report masking and hidden-term exports", async () => {
    const services = createServiceRegistry();
    const bootstrap = await services.dashboard.getDashboardBootstrap({
      preset: "today",
      scenarioId: "filtered-day"
    });

    const experience = buildDashboardExperience(bootstrap, {
      hideTermsInReport: true,
      forceMaskedContent: true
    });

    const exported = exportReportArtifact(experience.pages.report, {
      format: "text",
      hideTerms: true
    });
    const exportedByDefault = exportReportArtifact(experience.pages.report, {
      format: "text"
    });

    expect(exported.fileName.endsWith(".txt")).toBe(true);
    expect(exported.content).toContain("[已隐藏]");
    expect(exported.content).not.toContain("输入分析");
    expect(exported.content).not.toContain("词库迁移");
    expect(exportedByDefault.content).toContain("[已隐藏]");
    expect(exportedByDefault.content).not.toContain("输入分析");
    expect(exportedByDefault.content).not.toContain("词库迁移");
  });
});
