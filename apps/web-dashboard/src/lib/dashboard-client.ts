import type {
  LexiconEntry,
  LexiconFilterCategory,
  TimeRangePreset
} from "../../../../packages/contracts/src/index";
import {
  buildDashboardExperience,
  exportReportArtifact
} from "../../../../packages/dashboard/src/index";
import { createServiceRegistry } from "../../../../packages/services/src/index";
import { buildLexiconViewModel } from "./view-models/lexicon-view-model";
import { buildReportViewModel } from "./view-models/report-view-model";
import { formatScenarioLabel } from "./formatters";

export interface DashboardWorkspaceRequest {
  scenarioId: string;
  preset: TimeRangePreset;
  hideTermsInReport: boolean;
  forceMaskedContent: boolean;
  lexiconCategory: LexiconFilterCategory;
}

export interface DashboardWorkspace {
  selection: {
    scenarioId: string;
    scenarioSummary: string;
    preset: TimeRangePreset;
    rangeLabel: string;
    lexiconCategory: LexiconFilterCategory;
    hideTermsInReport: boolean;
    forceMaskedContent: boolean;
  };
  dashboard: ReturnType<typeof buildDashboardExperience> & {
    scenarioId: string;
  };
  lexicon: ReturnType<typeof buildLexiconViewModel>;
  report: ReturnType<typeof buildReportViewModel>;
}

const normalizeEntries = (entries: LexiconEntry[]): LexiconEntry[] =>
  entries.slice().sort((left, right) => right.usageCount - left.usageCount);

export const loadDashboardWorkspace = async (
  request: DashboardWorkspaceRequest
): Promise<DashboardWorkspace> => {
  const services = createServiceRegistry();
  const availableScenarios = await services.meta.listFixtureScenarios();

  if (!availableScenarios.includes(request.scenarioId)) {
    throw new Error(
      `Unknown scenario: ${request.scenarioId}. Available scenarios: ${availableScenarios.join(", ")}`
    );
  }

  const bootstrap = await services.dashboard.getDashboardBootstrap({
    scenarioId: request.scenarioId,
    preset: request.preset
  });
  const dashboard = {
    ...buildDashboardExperience(bootstrap, {
      hideTermsInReport: request.hideTermsInReport,
      forceMaskedContent: request.forceMaskedContent
    }),
    scenarioId: request.scenarioId
  };

  const overview = await services.lexicon.getOverview({
    scenarioId: request.scenarioId
  });
  const listed = await services.lexicon.listEntries({
    scenarioId: request.scenarioId,
    query: {
      category: request.lexiconCategory,
      search: "",
      sortBy: "usage-count",
      sortOrder: "desc",
      limit: 12
    }
  });
  const highFrequencyNew = await services.lexicon.identifyHighFrequencyNew({
    scenarioId: request.scenarioId
  });
  const lowFrequencyStale = await services.lexicon.identifyLowFrequencyStale({
    scenarioId: request.scenarioId
  });
  const rimeExport = await services.lexicon.exportEntries({
    scenarioId: request.scenarioId,
    request: {
      format: "rime",
      category: request.lexiconCategory
    }
  });

  const reportArtifact = exportReportArtifact(dashboard.pages.report, {
    format: "text",
    hideTerms: request.hideTermsInReport
  });

  const selectedCategoryEntries = normalizeEntries(listed.entries);
  const effectiveRangeLabel = dashboard.pages.overview.rangeLabel;
  const selection = {
    scenarioId: request.scenarioId,
    scenarioSummary: `${formatScenarioLabel(request.scenarioId)} · ${effectiveRangeLabel}`,
    preset: request.preset,
    rangeLabel: effectiveRangeLabel,
    lexiconCategory: request.lexiconCategory,
    hideTermsInReport: request.hideTermsInReport,
    forceMaskedContent: request.forceMaskedContent
  };

  return {
    selection,
    dashboard,
    lexicon: buildLexiconViewModel({
      overview,
      entries: selectedCategoryEntries,
      selectedCategory: request.lexiconCategory,
      highFrequencyNew,
      lowFrequencyStale,
      rimePreview: rimeExport.content.split("\n").slice(0, 5)
    }),
    report: buildReportViewModel(
      dashboard.pages.report,
      reportArtifact.content.split("\n").slice(0, 6)
    )
  };
};
