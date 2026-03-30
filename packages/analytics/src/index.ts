import type {
  FixtureScenario,
  InputRecordEvent,
  InputSession,
  SessionSummary,
  StatsSnapshot,
  TimeRange,
  TimeRangePreset
} from "../../contracts/src/index";
import {
  buildPreviousRange,
  filterRecordsByResolvedRange,
  filterSessionsByResolvedRange,
  resolveRangeFromQuery,
  type ResolvedRange
} from "./range-filter";
import {
  aggregateStatsSnapshot,
  buildTimelineByGranularity,
  type AggregateStatsInput,
  type TimelineGranularity
} from "./stats-aggregation";
import {
  analyzeVocabulary,
  type VocabularyAnalysisInput,
  type VocabularyAnalysisResult
} from "./vocabulary-analysis";
import {
  buildTimeActivity,
  type TimeActivityResult
} from "./time-activity-analysis";
import { summarizeSessions } from "./session-analysis";
import {
  generateHighlights,
  generateReportSummary
} from "./summary-generator";

export interface AnalyzeScenarioInput {
  scenario: FixtureScenario;
  preset: TimeRangePreset;
  nowIso?: string;
  customRange?: Pick<TimeRange, "startAt" | "endAt">;
}

export interface AnalyzeScenarioOutput {
  range: ResolvedRange;
  previousRange: ResolvedRange;
  currentRecords: InputRecordEvent[];
  previousRecords: InputRecordEvent[];
  currentSessions: InputSession[];
  stats: StatsSnapshot;
  vocabulary: VocabularyAnalysisResult;
  timeActivity: TimeActivityResult;
  sessionSummary: SessionSummary;
  highlights: string[];
  reportSummary: string;
}

export const analyzeScenario = (
  input: AnalyzeScenarioInput
): AnalyzeScenarioOutput => {
  const nowIso = input.nowIso ?? input.scenario.range.endAt ?? new Date().toISOString();

  const queryRange: TimeRange = {
    ...input.scenario.range,
    preset: input.preset,
    startAt:
      input.preset === "custom"
        ? input.customRange?.startAt ?? input.scenario.range.startAt
        : input.scenario.range.startAt,
    endAt:
      input.preset === "custom"
        ? input.customRange?.endAt ?? input.scenario.range.endAt
        : input.scenario.range.endAt
  };

  const range = resolveRangeFromQuery(queryRange, nowIso);
  const previousRange = buildPreviousRange(range);

  const currentRecords = filterRecordsByResolvedRange(input.scenario.records, range);
  const previousRecords = filterRecordsByResolvedRange(
    input.scenario.records,
    previousRange
  );
  const currentSessions = filterSessionsByResolvedRange(input.scenario.sessions, range);

  const sessionSummary = summarizeSessions(currentSessions);

  const statsInput: AggregateStatsInput = {
    range,
    events: currentRecords,
    previousEvents: previousRecords,
    sessionSummary
  };
  const stats = aggregateStatsSnapshot(statsInput);

  const vocabularyInput: VocabularyAnalysisInput = {
    currentEvents: currentRecords,
    previousEvents: previousRecords,
    stopWords: input.scenario.settings.stopWords
  };
  const vocabulary = analyzeVocabulary(vocabularyInput);

  const timeActivity = buildTimeActivity(currentRecords);

  const filteredCount = currentRecords.filter(
    (record) => !record.isDeleted && record.isFiltered
  ).length;

  const highlights = generateHighlights({
    metrics: stats.metrics,
    topTerms: vocabulary.topTerms,
    sessionSummary,
    filteredCount
  });

  const mergedStats: StatsSnapshot = {
    ...stats,
    hourlyBuckets: timeActivity.hourlyBuckets,
    heatmap: timeActivity.heatmap,
    highlights
  };

  return {
    range,
    previousRange,
    currentRecords,
    previousRecords,
    currentSessions,
    stats: mergedStats,
    vocabulary,
    timeActivity,
    sessionSummary,
    highlights,
    reportSummary: generateReportSummary(highlights)
  };
};

export {
  aggregateStatsSnapshot,
  analyzeVocabulary,
  buildPreviousRange,
  buildTimeActivity,
  buildTimelineByGranularity,
  filterRecordsByResolvedRange,
  filterSessionsByResolvedRange,
  generateHighlights,
  generateReportSummary,
  resolveRangeFromQuery,
  summarizeSessions
};

export type {
  AggregateStatsInput,
  ResolvedRange,
  TimelineGranularity,
  TimeActivityResult,
  VocabularyAnalysisInput,
  VocabularyAnalysisResult
};
