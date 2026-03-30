import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createServiceRegistry } from "../packages/services/src/index";
import dashboardExpected from "./fixtures/agent-f/expected/dashboard-normal-day.json";
import governanceExpected from "./fixtures/agent-f/expected/governance-export-summary.json";

const normalizeGeneratedAt = (content: string): string =>
  content.replace(
    /^# generatedAt: .*$/m,
    "# generatedAt: 2026-03-30T11:23:05.402Z"
  );

describe("agent F business snapshots", () => {
  it("matches the committed dashboard baseline for normal-day", async () => {
    const services = createServiceRegistry();
    const bootstrap = await services.dashboard.getDashboardBootstrap({
      preset: "last-7-days",
      scenarioId: "normal-day"
    });

    const subset = {
      scenarioId: bootstrap.scenarioId,
      overview: {
        range: bootstrap.overview.range,
        viewState: bootstrap.overview.viewState,
        metrics: bootstrap.overview.metrics,
        highlights: bootstrap.overview.highlights
      },
      vocabulary: {
        viewState: bootstrap.vocabulary.viewState,
        topTerms: bootstrap.vocabulary.topTerms
          .slice(0, 3)
          .map(({ term, kind, count, share }) => ({ term, kind, count, share })),
        phraseTerms: bootstrap.vocabulary.phraseTerms
          .slice(0, 3)
          .map(({ term, kind, count, share }) => ({ term, kind, count, share })),
        fallingTerms: bootstrap.vocabulary.fallingTerms.map(
          ({ term, kind, count, deltaFromPrevious }) => ({
            term,
            kind,
            count,
            deltaFromPrevious
          })
        )
      },
      timeActivity: {
        viewState: bootstrap.timeActivity.viewState,
        nonZeroHourlyBuckets: bootstrap.timeActivity.hourlyBuckets.filter(
          (bucket) => bucket.chars > 0
        ),
        heatmap: bootstrap.timeActivity.heatmap,
        sessions: bootstrap.timeActivity.sessions
      },
      governance: {
        viewState: bootstrap.governance.viewState,
        retention: bootstrap.governance.settings.retention,
        lastOperation: bootstrap.governance.lastOperation
      },
      report: {
        title: bootstrap.report.title,
        summary: bootstrap.report.summary,
        sections: bootstrap.report.sections,
        contentMasked: bootstrap.report.contentMasked
      }
    };

    expect(subset).toEqual(dashboardExpected);
  });

  it("matches the committed governance export summary", async () => {
    const services = createServiceRegistry();
    const exported = await services.governance.exportRecords({
      scenarioId: "normal-day",
      format: "json",
      maskContent: false
    });

    expect({
      scenarioId: "normal-day",
      request: {
        format: "json",
        maskContent: false
      },
      output: {
        masked: exported.output?.masked,
        exportedRecords: exported.output?.exportedRecords,
        sample: exported.output?.sample
      }
    }).toEqual(governanceExpected);
  });

  it("matches the committed rime export snapshot after timestamp normalization", async () => {
    const services = createServiceRegistry();
    const exported = await services.lexicon.exportEntries({
      scenarioId: "normal-day",
      request: {
        format: "rime",
        category: "all"
      }
    });
    const expected = readFileSync(
      new URL("./fixtures/agent-f/expected/lexicon-rime-export.txt", import.meta.url),
      "utf8"
    );

    expect(normalizeGeneratedAt(exported.content).trimEnd()).toBe(expected.trimEnd());
  });
});
