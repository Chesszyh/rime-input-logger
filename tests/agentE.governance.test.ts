import { describe, expect, it } from "vitest";

import { createServiceRegistry } from "../packages/services/src/index";

const getMetricValue = (
  metrics: Array<{ key: string; value: number | string }>,
  key: string
): number => {
  const card = metrics.find((metric) => metric.key === key);

  if (!card || typeof card.value !== "number") {
    return 0;
  }

  return card.value;
};

describe("agent E privacy and governance", () => {
  it("exposes settings-center summaries and risk notices", async () => {
    const services = createServiceRegistry();

    const governance = await services.governance.getSettingsCenter({
      scenarioId: "filtered-day"
    });

    expect(governance.recordingScopeSummary.length).toBeGreaterThan(0);
    expect(governance.retentionSummary.length).toBeGreaterThan(0);
    expect(governance.notices.length).toBeGreaterThan(0);
    expect(governance.confirmationPolicy.deleteRequiresConfirmation).toBe(true);
  });

  it("requires explicit confirmation before deleting records", async () => {
    const services = createServiceRegistry();

    const envelope = await services.governance.deleteRecords({
      scenarioId: "normal-day",
      scope: "day",
      dateKey: "2026-03-30",
      confirmed: false
    });

    expect(envelope.success).toBe(false);
    expect(envelope.errors.at(0)?.code).toBe("CONFIRMATION_REQUIRED");
  });

  it("requires second confirmation when deleting all records", async () => {
    const services = createServiceRegistry();

    const firstAttempt = await services.governance.deleteRecords({
      scenarioId: "normal-day",
      scope: "all",
      confirmed: true,
      secondConfirmed: false
    });

    expect(firstAttempt.success).toBe(false);
    expect(firstAttempt.errors.at(0)?.code).toBe("CONFIRMATION_REQUIRED");

    const secondAttempt = await services.governance.deleteRecords({
      scenarioId: "normal-day",
      scope: "all",
      confirmed: true,
      secondConfirmed: true
    });

    expect(secondAttempt.success).toBe(true);
  });

  it("keeps dashboard statistics consistent after deleting one day", async () => {
    const services = createServiceRegistry();

    const before = await services.dashboard.getDashboardBootstrap({
      preset: "today",
      scenarioId: "normal-day"
    });

    const beforeChars = getMetricValue(before.overview.metrics, "input-chars");

    const envelope = await services.governance.deleteRecords({
      scenarioId: "normal-day",
      scope: "day",
      dateKey: "2026-03-30",
      confirmed: true
    });

    expect(envelope.success).toBe(true);

    const after = await services.dashboard.getDashboardBootstrap({
      preset: "today",
      scenarioId: "normal-day"
    });
    const afterChars = getMetricValue(after.overview.metrics, "input-chars");

    expect(afterChars).toBeLessThan(beforeChars);
    expect(after.governance.lastOperation.operation).toBe("delete-records");
  });

  it("applies stats-only retention and keeps export masked", async () => {
    const services = createServiceRegistry();

    const retain = await services.governance.retainRecords({
      scenarioId: "normal-day",
      mode: "stats-only",
      retentionDays: null,
      autoArchive: true,
      exportMaskingEnabled: true,
      confirmed: true
    });

    expect(retain.success).toBe(true);

    const exported = await services.governance.exportRecords({
      scenarioId: "normal-day",
      format: "json",
      maskContent: false
    });

    expect(exported.success).toBe(true);
    expect(exported.output?.masked).toBe(true);
    expect((exported.output?.sample as string[]).join(" ")).not.toContain("共享契约");
  });

  it("keeps sample masked in store-masked mode even when export override is false", async () => {
    const services = createServiceRegistry();

    const retain = await services.governance.retainRecords({
      scenarioId: "normal-day",
      mode: "store-masked",
      retentionDays: 30,
      autoArchive: false,
      exportMaskingEnabled: false,
      confirmed: true
    });

    expect(retain.success).toBe(true);

    const exported = await services.governance.exportRecords({
      scenarioId: "normal-day",
      format: "json",
      maskContent: false
    });

    expect(exported.success).toBe(true);
    expect(exported.output?.masked).toBe(true);
    expect((exported.output?.sample as string[]).every((item) => item === "[MASKED]")).toBe(true);
  });

  it("supports blacklist rule updates and syncs filtered results", async () => {
    const services = createServiceRegistry();

    const before = await services.dashboard.getDashboardBootstrap({
      preset: "today",
      scenarioId: "normal-day"
    });

    const beforeChars = getMetricValue(before.overview.metrics, "input-chars");

    const update = await services.governance.upsertFilterRule({
      scenarioId: "normal-day",
      rule: {
        id: "rule-obsidian-app",
        type: "app",
        pattern: "md.obsidian",
        enabled: true,
        reason: "blacklist app"
      }
    });

    expect(update.success).toBe(true);

    const after = await services.dashboard.getDashboardBootstrap({
      preset: "today",
      scenarioId: "normal-day"
    });

    const afterChars = getMetricValue(after.overview.metrics, "input-chars");

    expect(afterChars).toBeLessThan(beforeChars);
    expect(after.overview.highlights.some((item) => item.includes("过滤"))).toBe(true);
  });

  it("rejects invalid range deletion requests", async () => {
    const services = createServiceRegistry();

    const result = await services.governance.deleteRecords({
      scenarioId: "normal-day",
      scope: "range",
      startAt: "invalid-start",
      endAt: "2026-03-30T23:59:59+08:00",
      confirmed: true
    });

    expect(result.success).toBe(false);
    expect(result.errors.at(0)?.code).toBe("INVALID_RANGE");
  });

  it("rejects negative retentionDays values", async () => {
    const services = createServiceRegistry();

    const result = await services.governance.retainRecords({
      scenarioId: "normal-day",
      mode: "store-masked",
      retentionDays: -1,
      autoArchive: true,
      exportMaskingEnabled: true,
      confirmed: true
    });

    expect(result.success).toBe(false);
    expect(result.errors.at(0)?.code).toBe("INVALID_RANGE");
  });

  it("supports recording switch and stopWords updates", async () => {
    const services = createServiceRegistry();

    const disabled = await services.governance.setRecordingEnabled({
      scenarioId: "normal-day",
      enabled: false,
      reason: "privacy mode"
    });

    expect(disabled.success).toBe(true);

    const disabledBootstrap = await services.dashboard.getDashboardBootstrap({
      preset: "today",
      scenarioId: "normal-day"
    });
    expect(disabledBootstrap.governance.viewState.code).toBe("PAUSED");

    const stopWords = await services.governance.updateStopWords({
      scenarioId: "normal-day",
      stopWords: ["共享契约", " 输入分析 "]
    });

    expect(stopWords.success).toBe(true);
    expect(stopWords.output?.stopWordsCount).toBe(2);

    const enabled = await services.governance.setRecordingEnabled({
      scenarioId: "normal-day",
      enabled: true
    });

    expect(enabled.success).toBe(true);
  });

  it("supports pause and resume with consistent view states", async () => {
    const services = createServiceRegistry();

    const paused = await services.governance.pauseRecording({
      scenarioId: "power-user-day",
      reason: "manual pause"
    });

    expect(paused.success).toBe(true);

    const pausedBootstrap = await services.dashboard.getDashboardBootstrap({
      preset: "last-30-days",
      scenarioId: "power-user-day"
    });
    expect(pausedBootstrap.governance.viewState.code).toBe("PAUSED");

    const resumed = await services.governance.resumeRecording({
      scenarioId: "power-user-day"
    });
    expect(resumed.success).toBe(true);

    const resumedBootstrap = await services.dashboard.getDashboardBootstrap({
      preset: "last-30-days",
      scenarioId: "power-user-day"
    });
    expect(resumedBootstrap.governance.viewState.code).toBe("READY");
  });
});
