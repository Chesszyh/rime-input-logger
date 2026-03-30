import {
  buildDashboardExperience,
  exportReportArtifact
} from "../../../packages/dashboard/src/index";
import { createServiceRegistry } from "../../../packages/services/src/index";
import { parseDemoArgs } from "./config";

const services = createServiceRegistry();

const run = async (): Promise<void> => {
  const config = parseDemoArgs(process.argv.slice(2));
  const availableScenarios = await services.meta.listFixtureScenarios();

  if (!availableScenarios.includes(config.scenarioId)) {
    throw new Error(
      `Unknown scenario: ${config.scenarioId}. Available scenarios: ${availableScenarios.join(", ")}`
    );
  }

  const bootstrap = await services.dashboard.getDashboardBootstrap({
    preset: config.preset,
    scenarioId: config.scenarioId
  });

  const dashboard = buildDashboardExperience(bootstrap, {
    hideTermsInReport: config.hideTermsInReport,
    forceMaskedContent: config.forceMaskedContent
  });
  const exportedReport = exportReportArtifact(dashboard.pages.report, {
    format: "text",
    hideTerms: config.hideTermsInReport
  });

  const lexiconOverview = await services.lexicon.getOverview({
    scenarioId: "normal-day"
  });
  const highFrequencyNew = await services.lexicon.identifyHighFrequencyNew({
    scenarioId: "normal-day"
  });
  const lowFrequencyStale = await services.lexicon.identifyLowFrequencyStale({
    scenarioId: "normal-day"
  });
  const rimeExport = await services.lexicon.exportEntries({
    scenarioId: "normal-day",
    request: {
      format: "rime",
      category: "all"
    }
  });

  console.log(
    JSON.stringify(
      {
        demoConfig: config,
        scenarioId: bootstrap.scenarioId,
        navigation: dashboard.navigation,
        overview: {
          state: dashboard.pages.overview.state,
          metrics: dashboard.pages.overview.metrics,
          highlights: dashboard.pages.overview.highlights
        },
        stats: {
          trendChart: dashboard.pages.stats.trendChart,
          sessionCards: dashboard.pages.stats.sessionCards
        },
        vocabulary: {
          topTermsChart: dashboard.pages.vocabulary.topTermsChart,
          changeChart: dashboard.pages.vocabulary.changeChart,
          wordCloud: dashboard.pages.vocabulary.wordCloud
        },
        time: {
          hourlyChart: dashboard.pages.time.hourlyChart,
          heatmapChart: dashboard.pages.time.heatmapChart,
          sessionCards: dashboard.pages.time.sessionCards
        },
        lexicon: {
          overview: lexiconOverview,
          highFrequencyNew: highFrequencyNew.map((entry) => entry.term),
          lowFrequencyStale: lowFrequencyStale.map((entry) => entry.term),
          rimePreview: rimeExport.content.split("\n").slice(0, 5)
        },
        report: {
          selectedTemplate: dashboard.pages.report.selectedTemplate,
          exportFormats: dashboard.pages.report.exportEntry.formats,
          textPreview: exportedReport.content.split("\n").slice(0, 6)
        }
      },
      null,
      2
    )
  );
};

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[demo] ${message}`);
  process.exitCode = 1;
});
