import type {
  MetricCard,
  SessionSummary,
  VocabularyInsight
} from "../../contracts/src/index";

export interface HighlightInput {
  metrics: MetricCard[];
  topTerms: VocabularyInsight[];
  sessionSummary: SessionSummary;
  filteredCount: number;
}

const getMetricNumber = (metrics: MetricCard[], key: MetricCard["key"]): number => {
  const metric = metrics.find((item) => item.key === key);

  return typeof metric?.value === "number" ? metric.value : 0;
};

export const generateHighlights = (input: HighlightInput): string[] => {
  const inputChars = getMetricNumber(input.metrics, "input-chars");
  const inputEntries = getMetricNumber(input.metrics, "input-entries");
  const activeDays = getMetricNumber(input.metrics, "active-days");
  const streakDays = getMetricNumber(input.metrics, "streak-days");

  const highlights: string[] = [];

  if (inputEntries === 0) {
    highlights.push("当前范围暂无可分析输入。");
  } else {
    highlights.push(`当前范围输入 ${inputChars} 字，共 ${inputEntries} 条。`);
    highlights.push(`活跃 ${activeDays} 天，连续活跃 ${streakDays} 天。`);
  }

  const topTerm = input.topTerms[0];
  if (topTerm) {
    highlights.push(`高频词：${topTerm.term}（${topTerm.count} 次）`);
  }

  highlights.push(
    `会话 ${input.sessionSummary.count} 次，最长 ${input.sessionSummary.longestDurationSeconds} 秒。`
  );

  if (input.filteredCount > 0) {
    highlights.push(`已过滤 ${input.filteredCount} 条记录。`);
  }

  return highlights;
};

export const generateReportSummary = (highlights: string[]): string => {
  if (highlights.length === 0) {
    return "暂无可展示统计结果。";
  }

  return highlights.slice(0, 3).join("；");
};
