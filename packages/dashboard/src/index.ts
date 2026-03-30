import type {
  AnalyticsReport,
  DashboardBootstrap,
  HeatmapCell,
  HourlyBucket,
  MetricCard,
  TimeRangePreset,
  ViewState,
  VocabularyInsight
} from "../../contracts/src/index";

export type DashboardPageKey =
  | "overview"
  | "stats"
  | "vocabulary"
  | "time"
  | "report";

export type ReportExportFormat = "json" | "text" | "html";

export interface DashboardNavigationItem {
  key: DashboardPageKey;
  label: string;
  description: string;
  stateCode: ViewState["code"];
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface DashboardChart {
  title: string;
  rangeLabel: string;
  unit: string;
  description: string;
  points: ChartPoint[];
}

export interface OverviewDashboardPage {
  key: "overview";
  title: string;
  rangeLabel: string;
  state: ViewState;
  metrics: MetricCard[];
  highlights: string[];
  emptyCopy: string;
}

export interface StatsDashboardPage {
  key: "stats";
  title: string;
  rangeLabel: string;
  state: ViewState;
  trendChart: DashboardChart;
  volumeChart: DashboardChart;
  sessionCards: Array<{
    label: string;
    value: number;
    unit: string;
  }>;
  emptyCopy: string;
}

export interface VocabularyDashboardPage {
  key: "vocabulary";
  title: string;
  rangeLabel: string;
  state: ViewState;
  topTerms: VocabularyInsight[];
  newTerms: VocabularyInsight[];
  risingTerms: VocabularyInsight[];
  fallingTerms: VocabularyInsight[];
  phraseTerms: VocabularyInsight[];
  topTermsChart: DashboardChart;
  changeChart: DashboardChart;
  wordCloud: DashboardChart;
  emptyCopy: string;
}

export interface TimeDashboardPage {
  key: "time";
  title: string;
  rangeLabel: string;
  state: ViewState;
  hourlyChart: DashboardChart;
  heatmapChart: DashboardChart;
  sessionCards: Array<{
    label: string;
    value: number;
    unit: string;
  }>;
  emptyCopy: string;
}

export interface ReportTemplate {
  id: "daily" | "weekly" | "monthly";
  preset: TimeRangePreset;
  title: string;
  summary: string;
  sections: AnalyticsReport["sections"];
}

export interface ReportDashboardPage {
  key: "report";
  title: string;
  rangeLabel: string;
  state: ViewState;
  templates: ReportTemplate[];
  selectedTemplate: ReportTemplate;
  reportSummary: string;
  topTerms: string[];
  maskTerms: string[];
  visibleTopTerms: string[];
  contentMasked: boolean;
  exportEntry: {
    formats: ReportExportFormat[];
    defaultFormat: ReportExportFormat;
  };
  emptyCopy: string;
}

export interface DashboardExperience {
  navigation: DashboardNavigationItem[];
  pages: {
    overview: OverviewDashboardPage;
    stats: StatsDashboardPage;
    vocabulary: VocabularyDashboardPage;
    time: TimeDashboardPage;
    report: ReportDashboardPage;
  };
}

export interface DashboardExperienceOptions {
  hideTermsInReport?: boolean;
  forceMaskedContent?: boolean;
}

export interface ReportExportRequest {
  format: ReportExportFormat;
  hideTerms?: boolean;
}

export interface ReportExportArtifact {
  format: ReportExportFormat;
  fileName: string;
  contentType: string;
  content: string;
}

const hasNoData = (state: ViewState, hasAnyData: boolean): boolean =>
  !hasAnyData || state.code === "NO_DATA" || state.code === "EMPTY_RESULT";

const resolveEmptyCopy = (state: ViewState, fallback: string): string => {
  const copy = state.description?.trim().length ? state.description : fallback;

  if (
    (state.code === "NO_DATA" || state.code === "EMPTY_RESULT") &&
    !copy.includes("暂无")
  ) {
    return `暂无数据。${copy}`;
  }

  return copy;
};

const toHourlyPoints = (hourlyBuckets: HourlyBucket[]): ChartPoint[] =>
  hourlyBuckets.map((bucket) => ({
    label: `${bucket.hour.toString().padStart(2, "0")}:00`,
    value: bucket.chars
  }));

const toTimelinePoints = (
  timeline: DashboardBootstrap["overview"]["timeline"]
): ChartPoint[] =>
  timeline.map((point) => ({
    label: point.bucket,
    value: point.chars
  }));

const toHeatmapPoints = (heatmap: HeatmapCell[]): ChartPoint[] =>
  heatmap.map((cell) => ({
    label: `${cell.dateKey} ${cell.bucketLabel}`,
    value: cell.chars
  }));

const toTopTermPoints = (terms: VocabularyInsight[]): ChartPoint[] =>
  terms.map((item) => ({ label: item.term, value: item.count }));

const toTermChangePoints = (terms: VocabularyInsight[]): ChartPoint[] =>
  terms.map((item) => ({ label: item.term, value: item.deltaFromPrevious }));

const toWordCloudPoints = (terms: VocabularyInsight[]): ChartPoint[] =>
  terms.map((item) => ({
    label: item.term,
    value: Math.max(1, Math.round(item.share * 100))
  }));

const mergeUniqueTerms = (...groups: VocabularyInsight[][]): VocabularyInsight[] => {
  const merged: VocabularyInsight[] = [];
  const seenTerms = new Set<string>();

  groups.flat().forEach((item) => {
    if (seenTerms.has(item.normalizedTerm)) {
      return;
    }

    seenTerms.add(item.normalizedTerm);
    merged.push(item);
  });

  return merged;
};

const mapPresetToTemplate = (preset: TimeRangePreset): ReportTemplate["id"] => {
  switch (preset) {
    case "today":
    case "yesterday":
    case "custom":
      return "daily";
    case "last-7-days":
      return "weekly";
    default:
      return "monthly";
  }
};

const buildReportTemplates = (report: AnalyticsReport): ReportTemplate[] => [
  {
    id: "daily",
    preset: "today",
    title: `日报：${report.title}`,
    summary: `${report.summary}（日报视角）`,
    sections: report.sections
  },
  {
    id: "weekly",
    preset: "last-7-days",
    title: `周报：${report.title}`,
    summary: `${report.summary}（周报视角）`,
    sections: report.sections
  },
  {
    id: "monthly",
    preset: "last-30-days",
    title: `月报：${report.title}`,
    summary: `${report.summary}（月报视角）`,
    sections: report.sections
  }
];

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const expandMaskTerms = (terms: string[]): string[] => {
  const expanded = new Set<string>();

  terms.forEach((term) => {
    const cleaned = term.trim();

    if (cleaned.length === 0) {
      return;
    }

    expanded.add(cleaned);

    cleaned
      .split(/[\s,，。；、:：/|]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
      .forEach((token) => {
        expanded.add(token);
      });

    const zhChunks = cleaned.match(/[\u4e00-\u9fff]{4,}/g) ?? [];

    zhChunks.forEach((chunk) => {
      for (let index = 0; index <= chunk.length - 4; index += 1) {
        expanded.add(chunk.slice(index, index + 4));
      }
    });
  });

  return Array.from(expanded).sort((left, right) => right.length - left.length);
};

export const buildDashboardExperience = (
  bootstrap: DashboardBootstrap,
  options: DashboardExperienceOptions = {}
): DashboardExperience => {
  const rangeLabel = bootstrap.overview.range.label;
  const overviewNoData = hasNoData(
    bootstrap.overview.viewState,
    bootstrap.overview.metrics.length > 0
  );

  const overview: OverviewDashboardPage = {
    key: "overview",
    title: "总览页",
    rangeLabel,
    state: bootstrap.overview.viewState,
    metrics: bootstrap.overview.metrics,
    highlights: bootstrap.overview.highlights,
    emptyCopy: resolveEmptyCopy(
      bootstrap.overview.viewState,
      "暂无可展示指标，可先导入样例数据或切换时间范围。"
    )
  };

  const stats: StatsDashboardPage = {
    key: "stats",
    title: "统计页",
    rangeLabel,
    state: bootstrap.timeActivity.viewState,
    trendChart: {
      title: "输入趋势图",
      rangeLabel,
      unit: "字",
      description: "展示按天聚合的输入字数趋势。",
      points: toTimelinePoints(bootstrap.overview.timeline)
    },
    volumeChart: {
      title: "指标体量图",
      rangeLabel,
      unit: "数值",
      description: "按卡片指标展示当前周期关键体量。",
      points: bootstrap.overview.metrics
        .filter((metric): metric is MetricCard & { value: number } =>
          typeof metric.value === "number"
        )
        .map((metric) => ({
          label: metric.label,
          value: metric.value
        }))
    },
    sessionCards: [
      {
        label: "会话次数",
        value: bootstrap.timeActivity.sessions.count,
        unit: "次"
      },
      {
        label: "平均会话时长",
        value: bootstrap.timeActivity.sessions.averageDurationSeconds,
        unit: "秒"
      },
      {
        label: "最长会话",
        value: bootstrap.timeActivity.sessions.longestDurationSeconds,
        unit: "秒"
      }
    ],
    emptyCopy: resolveEmptyCopy(
      bootstrap.timeActivity.viewState,
      "暂无统计结果，可检查时间范围或等待更多数据。"
    )
  };

  const topTerms = bootstrap.vocabulary.topTerms;
  const newTerms = bootstrap.vocabulary.newTerms;
  const risingTerms = bootstrap.vocabulary.risingTerms;
  const fallingTerms = bootstrap.vocabulary.fallingTerms;
  const phraseTerms = bootstrap.vocabulary.phraseTerms;
  const changeTerms = [...newTerms, ...risingTerms, ...fallingTerms];
  const wordCloudTerms = mergeUniqueTerms(phraseTerms, topTerms).slice(0, 20);

  const vocabulary: VocabularyDashboardPage = {
    key: "vocabulary",
    title: "词汇页",
    rangeLabel,
    state: bootstrap.vocabulary.viewState,
    topTerms,
    newTerms,
    risingTerms,
    fallingTerms,
    phraseTerms,
    topTermsChart: {
      title: "高频词榜",
      rangeLabel,
      unit: "次",
      description: "按出现次数展示高频词与短语。",
      points: toTopTermPoints(topTerms)
    },
    changeChart: {
      title: "新词与热词变化",
      rangeLabel,
      unit: "变化值",
      description: "展示新词增长和热词变化趋势。",
      points: toTermChangePoints(changeTerms)
    },
    wordCloud: {
      title: "词云展示区",
      rangeLabel,
      unit: "权重",
      description: "词云权重由词频占比换算得出，便于快速感知主题。",
      points: toWordCloudPoints(wordCloudTerms)
    },
    emptyCopy: resolveEmptyCopy(
      bootstrap.vocabulary.viewState,
      "暂无可展示词汇，可扩大时间范围查看历史数据。"
    )
  };

  const time: TimeDashboardPage = {
    key: "time",
    title: "时间页",
    rangeLabel,
    state: bootstrap.timeActivity.viewState,
    hourlyChart: {
      title: "活跃时段图",
      rangeLabel,
      unit: "字",
      description: "按小时展示输入活跃分布。",
      points: toHourlyPoints(bootstrap.timeActivity.hourlyBuckets)
    },
    heatmapChart: {
      title: "热力图展示",
      rangeLabel,
      unit: "字",
      description: "按日期 × 时段展示输入强度。",
      points: toHeatmapPoints(bootstrap.timeActivity.heatmap)
    },
    sessionCards: [
      {
        label: "会话总数",
        value: bootstrap.timeActivity.sessions.count,
        unit: "次"
      },
      {
        label: "平均会话时长",
        value: bootstrap.timeActivity.sessions.averageDurationSeconds,
        unit: "秒"
      },
      {
        label: "高强度会话",
        value: bootstrap.timeActivity.sessions.focusSessionCount,
        unit: "次"
      }
    ],
    emptyCopy: resolveEmptyCopy(
      bootstrap.timeActivity.viewState,
      "暂无时段分布数据，可先积累记录后再查看。"
    )
  };

  const reportTopTerms = bootstrap.vocabulary.topTerms
    .slice(0, 8)
    .map((item) => item.term);
  const reportMaskTerms = expandMaskTerms([
    ...bootstrap.vocabulary.topTerms.map((item) => item.term),
    ...bootstrap.vocabulary.newTerms.map((item) => item.term),
    ...bootstrap.vocabulary.risingTerms.map((item) => item.term)
  ]);
  const hideTermsInReport = options.hideTermsInReport ?? false;

  const maskByTerms = (value: string): string =>
    hideTermsInReport
      ? reportMaskTerms.reduce(
          (current, term) =>
            term.trim().length ? current.replaceAll(term, "[已隐藏]") : current,
          value
        )
      : value;

  const templates = buildReportTemplates(bootstrap.report).map((template) => ({
    ...template,
    title: maskByTerms(template.title),
    summary: maskByTerms(template.summary),
    sections: template.sections.map((section) => ({
      ...section,
      title: maskByTerms(section.title),
      summary: maskByTerms(section.summary)
    }))
  }));

  const selectedTemplateId = mapPresetToTemplate(bootstrap.report.range.preset);
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? templates[0];

  const visibleTopTerms = hideTermsInReport
    ? reportTopTerms.map(() => "[已隐藏]")
    : reportTopTerms;
  const reportContentMasked =
    (options.forceMaskedContent ?? false) ||
    bootstrap.report.contentMasked ||
    bootstrap.governance.settings.retention.exportMaskingEnabled;

  const report: ReportDashboardPage = {
    key: "report",
    title: "报告页",
    rangeLabel: bootstrap.report.range.label,
    state: bootstrap.overview.viewState,
    templates,
    selectedTemplate,
    reportSummary: selectedTemplate.summary,
    topTerms: reportTopTerms,
    maskTerms: reportMaskTerms,
    visibleTopTerms,
    contentMasked: reportContentMasked,
    exportEntry: {
      formats: ["json", "text", "html"],
      defaultFormat: "text"
    },
    emptyCopy: resolveEmptyCopy(
      bootstrap.overview.viewState,
      "暂无可导出报告，先切换到有数据的时间范围。"
    )
  };

  const navigation: DashboardNavigationItem[] = [
    {
      key: "overview",
      label: "总览",
      description: "关键指标与摘要",
      stateCode: overview.state.code
    },
    {
      key: "stats",
      label: "统计",
      description: "趋势与体量图表",
      stateCode: stats.state.code
    },
    {
      key: "vocabulary",
      label: "词汇",
      description: "高频词、新词与词云",
      stateCode: vocabulary.state.code
    },
    {
      key: "time",
      label: "时间",
      description: "活跃时段与热力图",
      stateCode: time.state.code
    },
    {
      key: "report",
      label: "报告",
      description: "模板与导出",
      stateCode: report.state.code
    }
  ];

  if (overviewNoData) {
    report.visibleTopTerms = report.visibleTopTerms.length
      ? report.visibleTopTerms
      : ["暂无词汇"];
  }

  return {
    navigation,
    pages: {
      overview,
      stats,
      vocabulary,
      time,
      report
    }
  };
};

export const exportReportArtifact = (
  reportPage: ReportDashboardPage,
  request: ReportExportRequest
): ReportExportArtifact => {
  const shouldHideTerms = request.hideTerms ?? reportPage.contentMasked;

  const maskByTerms = (value: string): string => {
    if (!shouldHideTerms) {
      return value;
    }

    return reportPage.maskTerms.reduce(
      (current, term) =>
        term.trim().length ? current.replaceAll(term, "[已隐藏]") : current,
      value
    );
  };

  const terms = shouldHideTerms
    ? reportPage.topTerms.map(() => "[已隐藏]")
    : reportPage.topTerms;
  const contentMasked = shouldHideTerms;

  const payload = {
    title: maskByTerms(reportPage.selectedTemplate.title),
    range: reportPage.rangeLabel,
    summary: maskByTerms(reportPage.reportSummary),
    sections: reportPage.selectedTemplate.sections.map((section) => ({
      ...section,
      title: maskByTerms(section.title),
      summary: maskByTerms(section.summary)
    })),
    topTerms: terms,
    contentMasked
  };

  const baseFileName = `input-report-${reportPage.selectedTemplate.id}`;

  if (request.format === "json") {
    return {
      format: "json",
      fileName: `${baseFileName}.json`,
      contentType: "application/json",
      content: JSON.stringify(payload, null, 2)
    };
  }

  if (request.format === "html") {
    const sectionHtml = payload.sections
      .map(
        (section) =>
          `<li><strong>${escapeHtml(section.title)}</strong>：${escapeHtml(section.summary)}</li>`
      )
      .join("");

    const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(payload.title)}</title>
  </head>
  <body>
    <h1>${escapeHtml(payload.title)}</h1>
    <p>范围：${escapeHtml(payload.range)}</p>
    <p>摘要：${escapeHtml(payload.summary)}</p>
    <p>内容状态：${payload.contentMasked ? "已脱敏" : "原文可见"}</p>
    <h2>章节</h2>
    <ul>${sectionHtml}</ul>
    <h2>高频词</h2>
    <p>${escapeHtml(payload.topTerms.join("、") || "暂无")}</p>
  </body>
</html>`;

    return {
      format: "html",
      fileName: `${baseFileName}.html`,
      contentType: "text/html; charset=utf-8",
      content: html
    };
  }

  const lines = [
    payload.title,
    `范围：${payload.range}`,
    `摘要：${payload.summary}`,
    `内容状态：${payload.contentMasked ? "已脱敏" : "原文可见"}`,
    "章节：",
    ...payload.sections.map((section) => `- ${section.title}：${section.summary}`),
    `高频词：${payload.topTerms.length ? payload.topTerms.join("、") : "暂无"}`
  ];

  return {
    format: "text",
    fileName: `${baseFileName}.txt`,
    contentType: "text/plain; charset=utf-8",
    content: lines.join("\n")
  };
};
