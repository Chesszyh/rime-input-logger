import { describe, expect, it } from "vitest";

import { buildDashboardExperience, exportReportArtifact } from "../packages/dashboard/src/index";
import type { RawInputRecord, UserSettings } from "../packages/contracts/src/index";
import { createServiceRegistry } from "../packages/services/src/index";
import rawInputFixture from "./fixtures/agent-f/raw-input-records.json";

const fixtureSettings = rawInputFixture.settings as UserSettings;
const fixtureRecords = rawInputFixture.records as RawInputRecord[];

const getMetricValue = (
  metrics: Array<{ key: string; value: number | string }>,
  key: string
): number => {
  const metric = metrics.find((item) => item.key === key);

  return metric && typeof metric.value === "number" ? metric.value : 0;
};

describe("agent F business workflows", () => {
  it("keeps the empty workspace readable from dashboard through report export", async () => {
    const services = createServiceRegistry();

    const bootstrap = await services.dashboard.getDashboardBootstrap({
      preset: "today",
      scenarioId: "empty-history"
    });
    const experience = buildDashboardExperience(bootstrap);
    const reportExport = exportReportArtifact(experience.pages.report, {
      format: "text"
    });

    expect(bootstrap.overview.viewState.code).toBe("NO_DATA");
    expect(experience.pages.overview.emptyCopy).toContain("暂无");
    expect(experience.pages.stats.emptyCopy).toContain("暂无");
    expect(experience.pages.vocabulary.emptyCopy).toContain("暂无");
    expect(experience.pages.time.emptyCopy).toContain("暂无");
    expect(experience.pages.report.emptyCopy).toContain("暂无");
    expect(reportExport.fileName).toBe("input-report-daily.txt");
    expect(reportExport.content).toContain("暂无");
  });

  it("drops repeated captures when the same input arrives twice in the dedupe window", async () => {
    const services = createServiceRegistry();

    const output = services.ingestion.processRawRecords({
      records: [
        {
          id: "raw-101",
          occurredAt: "2026-03-30T10:00:00+08:00",
          appId: "org.mozilla.firefox",
          appName: "Firefox",
          text: "输入分析"
        },
        {
          id: "raw-102",
          occurredAt: "2026-03-30T10:00:01+08:00",
          appId: "org.mozilla.firefox",
          appName: "Firefox",
          text: "输入分析"
        },
        {
          id: "raw-103",
          occurredAt: "2026-03-30T10:00:04+08:00",
          appId: "org.mozilla.firefox",
          appName: "Firefox",
          text: "输入分析报告"
        }
      ],
      timezone: "Asia/Shanghai",
      settings: fixtureSettings
    });

    expect(output.events.map((event) => event.id)).toEqual(["raw-101", "raw-103"]);
    expect(output.dropped).toEqual([
      {
        id: "raw-102",
        reason: "duplicate-input"
      }
    ]);
  });

  it("keeps overnight work visible on the day it crosses midnight", async () => {
    const services = createServiceRegistry();

    const output = services.ingestion.processRawRecords({
      records: fixtureRecords,
      timezone: rawInputFixture.timezone,
      settings: fixtureSettings,
      duplicateWindowSeconds: rawInputFixture.duplicateWindowSeconds
    });
    const todaySessions = services.ingestion.readSessions(output.sessions, {
      preset: "today",
      timezone: rawInputFixture.timezone,
      nowAt: "2026-03-31T12:00:00+08:00"
    });
    const todayEvents = services.ingestion.readEvents(output.events, {
      preset: "today",
      timezone: rawInputFixture.timezone,
      nowAt: "2026-03-31T12:00:00+08:00"
    });
    const overnightSession = output.sessions.find((session) => session.crossedMidnight);

    expect(output.sessions).toHaveLength(1);
    expect(overnightSession).toMatchObject({
      crossedMidnight: true,
      eventIds: ["raw-001", "raw-002", "raw-003", "raw-005"]
    });
    expect(todaySessions.map((session) => session.id)).toEqual([
      overnightSession?.id
    ]);
    expect(todayEvents.map((event) => event.id)).toEqual(["raw-003", "raw-005"]);
    expect(output.dropped).toEqual([
      {
        id: "raw-004",
        reason: "duplicate-input"
      }
    ]);
  });

  it("shows a filtered range as empty when no usable records remain in view", async () => {
    const services = createServiceRegistry();

    const bootstrap = await services.dashboard.getDashboardBootstrap({
      preset: "yesterday",
      scenarioId: "filtered-day"
    });
    const experience = buildDashboardExperience(bootstrap);

    expect(bootstrap.overview.viewState.code).toBe("EMPTY_RESULT");
    expect(bootstrap.overview.viewState.description).toContain("过滤");
    expect(getMetricValue(bootstrap.overview.metrics, "input-entries")).toBe(0);
    expect(experience.pages.overview.emptyCopy).toContain("暂无");
    expect(experience.pages.report.state.code).toBe("EMPTY_RESULT");
  });

  it("requires confirmation for deletion and keeps retention updates applied", async () => {
    const services = createServiceRegistry();

    const blockedDelete = await services.governance.deleteRecords({
      scenarioId: "normal-day",
      scope: "day",
      dateKey: "2026-03-30",
      confirmed: false
    });
    const acceptedDelete = await services.governance.deleteRecords({
      scenarioId: "normal-day",
      scope: "day",
      dateKey: "2026-03-30",
      confirmed: true
    });
    const acceptedRetention = await services.governance.retainRecords({
      scenarioId: "normal-day",
      mode: "store-masked",
      retentionDays: 30,
      autoArchive: false,
      exportMaskingEnabled: false,
      confirmed: true
    });
    const updatedBootstrap = await services.dashboard.getDashboardBootstrap({
      preset: "today",
      scenarioId: "normal-day"
    });

    expect(blockedDelete.success).toBe(false);
    expect(blockedDelete.errors.at(0)?.code).toBe("CONFIRMATION_REQUIRED");
    expect(acceptedDelete.success).toBe(true);
    expect(acceptedRetention.success).toBe(true);
    expect(updatedBootstrap.governance.lastOperation.operation).toBe("retain-records");
    expect(getMetricValue(updatedBootstrap.overview.metrics, "input-chars")).toBeLessThan(
      154
    );
  });

  it("exports a masked report and a full lexicon package for downstream delivery", async () => {
    const services = createServiceRegistry();

    const bootstrap = await services.dashboard.getDashboardBootstrap({
      preset: "last-7-days",
      scenarioId: "normal-day"
    });
    const experience = buildDashboardExperience(bootstrap, {
      hideTermsInReport: true,
      forceMaskedContent: true
    });
    const reportExport = exportReportArtifact(experience.pages.report, {
      format: "text",
      hideTerms: true
    });
    const lexiconExport = await services.lexicon.exportEntries({
      scenarioId: "normal-day",
      request: {
        format: "rime",
        category: "all"
      }
    });

    expect(reportExport.fileName).toBe("input-report-weekly.txt");
    expect(reportExport.content).toContain("[已隐藏]");
    expect(reportExport.content).not.toContain("输入分析");
    expect(lexiconExport.format).toBe("rime");
    expect(lexiconExport.exportedCount).toBe(6);
    expect(lexiconExport.content).toContain("# Rime dictionary export");
    expect(lexiconExport.content).toContain("输入分析");
  });
});
