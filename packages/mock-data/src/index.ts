import type {
  AnalyticsReport,
  DashboardBootstrap,
  FixtureScenario,
  GovernancePageData,
  InputRecordEvent,
  InputSession,
  LexiconEntry,
  MetricCard,
  OperationEnvelope,
  StatsSnapshot,
  TimeActivityPageData,
  TimeRange,
  UserSettings,
  ViewState,
  VocabularyInsight,
  VocabularyPageData
} from "../../contracts/src/index";

const timezone = "Asia/Shanghai";

const baseSettings: UserSettings = {
  recordingEnabled: true,
  paused: false,
  retention: {
    mode: "store-masked",
    retentionDays: 90,
    autoArchive: true,
    exportMaskingEnabled: true
  },
  filterRules: [
    {
      id: "rule-password-manager",
      type: "app",
      pattern: "com.bitwarden.desktop",
      enabled: true,
      reason: "sensitive app"
    },
    {
      id: "rule-secrets",
      type: "regex",
      pattern: "(token|密码|secret)",
      enabled: true,
      reason: "sensitive text"
    }
  ],
  stopWords: ["的", "了", "是", "我"],
  sessionGapSeconds: 900
};

const baseOperation: OperationEnvelope<Record<string, unknown>, Record<string, unknown>> =
  {
    requestId: "op-export-001",
    operation: "export-records",
    input: {
      scenarioId: "normal-day",
      format: "json"
    },
    output: {
      exportedRecords: 4,
      masked: true
    },
    success: true,
    errors: [],
    performedAt: "2026-03-30T17:00:00+08:00"
  };

const makeRange = (label: string, preset: TimeRange["preset"]): TimeRange => ({
  preset,
  label,
  timezone,
  startAt: "2026-03-24T00:00:00+08:00",
  endAt: "2026-03-30T23:59:59+08:00"
});

const readyState: ViewState = {
  code: "READY",
  title: "数据可用",
  description: "当前时间范围内有可展示的输入与分析结果。"
};

const noDataState: ViewState = {
  code: "NO_DATA",
  title: "暂无输入记录",
  description: "可以先导入样例数据，或等待记录模块开始写入。"
};

const emptyMetrics = (): MetricCard[] => [
  { key: "input-chars", label: "输入字数", value: 0, unit: "字" },
  { key: "input-entries", label: "输入条数", value: 0, unit: "条" },
  { key: "active-days", label: "活跃天数", value: 0, unit: "天" },
  { key: "streak-days", label: "连续活跃", value: 0, unit: "天" }
];

const makeStats = (
  range: TimeRange,
  metrics: MetricCard[],
  highlights: string[],
  hourlyBuckets: number[],
  sessionSummary: StatsSnapshot["sessionSummary"]
): StatsSnapshot => ({
  range,
  metrics,
  timeline: [
    { bucket: "2026-03-24", chars: 120, entries: 6, tokens: 20 },
    { bucket: "2026-03-25", chars: 160, entries: 7, tokens: 25 },
    { bucket: "2026-03-26", chars: 180, entries: 8, tokens: 30 },
    { bucket: "2026-03-27", chars: 220, entries: 10, tokens: 34 },
    { bucket: "2026-03-28", chars: 260, entries: 12, tokens: 40 },
    { bucket: "2026-03-29", chars: 280, entries: 12, tokens: 43 },
    { bucket: "2026-03-30", chars: 320, entries: 14, tokens: 48 }
  ],
  hourlyBuckets: hourlyBuckets.map((chars, hour) => ({
    hour,
    chars,
    entries: chars === 0 ? 0 : Math.max(1, Math.round(chars / 32))
  })),
  heatmap: [
    { dateKey: "2026-03-28", bucketLabel: "20:00-21:59", chars: 72 },
    { dateKey: "2026-03-29", bucketLabel: "09:00-10:59", chars: 44 },
    { dateKey: "2026-03-30", bucketLabel: "22:00-23:59", chars: 95 }
  ],
  sessionSummary,
  highlights
});

const normalRecords: InputRecordEvent[] = [
  {
    id: "evt-000",
    occurredAt: "2026-03-21T20:18:00+08:00",
    dateKey: "2026-03-21",
    timezone,
    schemaVersion: "1.0",
    source: "mock",
    appId: "md.obsidian",
    appName: "Obsidian",
    scope: "allow",
    sessionId: null,
    rawText: null,
    maskedText: "旧版术语",
    normalizedText: "旧版术语",
    textLanguage: "zh-CN",
    charCount: 4,
    tokenCount: 1,
    candidateIndex: 1,
    isDeleted: false,
    isFiltered: false,
    filterReasons: [],
    tags: ["history"]
  },
  {
    id: "evt-001",
    occurredAt: "2026-03-30T09:12:00+08:00",
    dateKey: "2026-03-30",
    timezone,
    schemaVersion: "1.0",
    source: "mock",
    appId: "org.mozilla.firefox",
    appName: "Firefox",
    scope: "allow",
    sessionId: "ses-001",
    rawText: null,
    maskedText: "今天把输入分析骨架搭起来",
    normalizedText: "今天把输入分析骨架搭起来",
    textLanguage: "zh-CN",
    charCount: 12,
    tokenCount: 4,
    candidateIndex: 1,
    isDeleted: false,
    isFiltered: false,
    filterReasons: [],
    tags: ["planning"]
  },
  {
    id: "evt-002",
    occurredAt: "2026-03-30T09:18:00+08:00",
    dateKey: "2026-03-30",
    timezone,
    schemaVersion: "1.0",
    source: "mock",
    appId: "org.mozilla.firefox",
    appName: "Firefox",
    scope: "allow",
    sessionId: "ses-001",
    rawText: null,
    maskedText: "共享契约需要先稳定下来",
    normalizedText: "共享契约需要先稳定下来",
    textLanguage: "zh-CN",
    charCount: 12,
    tokenCount: 4,
    candidateIndex: 1,
    isDeleted: false,
    isFiltered: false,
    filterReasons: [],
    tags: ["architecture"]
  },
  {
    id: "evt-003",
    occurredAt: "2026-03-30T22:05:00+08:00",
    dateKey: "2026-03-30",
    timezone,
    schemaVersion: "1.0",
    source: "mock",
    appId: "md.obsidian",
    appName: "Obsidian",
    scope: "allow",
    sessionId: "ses-002",
    rawText: null,
    maskedText: "最近高频词和报告字段要统一",
    normalizedText: "最近高频词和报告字段要统一",
    textLanguage: "zh-CN",
    charCount: 14,
    tokenCount: 5,
    candidateIndex: 2,
    isDeleted: false,
    isFiltered: false,
    filterReasons: [],
    tags: ["report"]
  },
  {
    id: "evt-004",
    occurredAt: "2026-03-30T22:28:00+08:00",
    dateKey: "2026-03-30",
    timezone,
    schemaVersion: "1.0",
    source: "mock",
    appId: "md.obsidian",
    appName: "Obsidian",
    scope: "allow",
    sessionId: "ses-002",
    rawText: null,
    maskedText: "词库迁移至少需要结构化导出",
    normalizedText: "词库迁移至少需要结构化导出",
    textLanguage: "zh-CN",
    charCount: 15,
    tokenCount: 5,
    candidateIndex: 1,
    isDeleted: false,
    isFiltered: false,
    filterReasons: [],
    tags: ["lexicon"]
  }
];

const normalSessions: InputSession[] = [
  {
    id: "ses-001",
    startedAt: "2026-03-30T09:12:00+08:00",
    endedAt: "2026-03-30T09:22:00+08:00",
    dateKey: "2026-03-30",
    timezone,
    eventIds: ["evt-001", "evt-002"],
    totalChars: 24,
    totalTokens: 8,
    durationSeconds: 600,
    idleGapSeconds: 360,
    crossedMidnight: false,
    intensity: "normal"
  },
  {
    id: "ses-002",
    startedAt: "2026-03-30T22:05:00+08:00",
    endedAt: "2026-03-30T22:35:00+08:00",
    dateKey: "2026-03-30",
    timezone,
    eventIds: ["evt-003", "evt-004"],
    totalChars: 29,
    totalTokens: 10,
    durationSeconds: 1800,
    idleGapSeconds: 420,
    crossedMidnight: false,
    intensity: "deep-focus"
  }
];

const normalVocabulary: VocabularyInsight[] = [
  {
    id: "voc-001",
    term: "输入分析",
    normalizedTerm: "输入分析",
    kind: "top",
    count: 6,
    share: 0.16,
    deltaFromPrevious: 2,
    firstSeenAt: "2026-03-28T20:00:00+08:00",
    lastSeenAt: "2026-03-30T22:28:00+08:00",
    isStopWord: false,
    sourceEventIds: ["evt-001", "evt-003"]
  },
  {
    id: "voc-002",
    term: "共享契约",
    normalizedTerm: "共享契约",
    kind: "new",
    count: 3,
    share: 0.08,
    deltaFromPrevious: 3,
    firstSeenAt: "2026-03-30T09:18:00+08:00",
    lastSeenAt: "2026-03-30T09:18:00+08:00",
    isStopWord: false,
    sourceEventIds: ["evt-002"]
  },
  {
    id: "voc-003",
    term: "词库迁移",
    normalizedTerm: "词库迁移",
    kind: "rising",
    count: 4,
    share: 0.1,
    deltaFromPrevious: 2,
    firstSeenAt: "2026-03-27T21:00:00+08:00",
    lastSeenAt: "2026-03-30T22:28:00+08:00",
    isStopWord: false,
    sourceEventIds: ["evt-004"]
  }
];

const normalLexicon: LexiconEntry[] = [
  {
    id: "lex-001",
    term: "输入分析",
    normalizedTerm: "输入分析",
    category: "domain",
    status: "active",
    firstSeenAt: "2026-03-21T20:00:00+08:00",
    lastSeenAt: "2026-03-30T22:28:00+08:00",
    usageCount: 18,
    source: "analysis"
  },
  {
    id: "lex-002",
    term: "共享契约",
    normalizedTerm: "共享契约",
    category: "phrase",
    status: "favorite",
    firstSeenAt: "2026-03-30T09:18:00+08:00",
    lastSeenAt: "2026-03-30T09:18:00+08:00",
    usageCount: 3,
    source: "analysis",
    notes: "Agent 0 baseline"
  },
  {
    id: "lex-003",
    term: "词库迁移",
    normalizedTerm: "词库迁移",
    category: "domain",
    status: "active",
    firstSeenAt: "2026-03-28T21:00:00+08:00",
    lastSeenAt: "2026-03-30T22:28:00+08:00",
    usageCount: 7,
    source: "analysis",
    notes: "high-frequency new"
  },
  {
    id: "lex-004",
    term: "旧版术语",
    normalizedTerm: "旧版术语",
    category: "low-frequency",
    status: "archived",
    firstSeenAt: "2025-12-18T10:00:00+08:00",
    lastSeenAt: "2026-02-08T09:10:00+08:00",
    usageCount: 1,
    source: "analysis",
    notes: "stale candidate"
  },
  {
    id: "lex-005",
    term: "临时噪声",
    normalizedTerm: "临时噪声",
    category: "noise",
    status: "ignored",
    firstSeenAt: "2026-01-09T11:00:00+08:00",
    lastSeenAt: "2026-01-20T11:05:00+08:00",
    usageCount: 2,
    source: "analysis"
  },
  {
    id: "lex-006",
    term: "待清理词",
    normalizedTerm: "待清理词",
    category: "general",
    status: "deleted",
    firstSeenAt: "2026-02-01T08:00:00+08:00",
    lastSeenAt: "2026-02-12T08:11:00+08:00",
    usageCount: 1,
    source: "manual"
  }
];

const normalReport: AnalyticsReport = {
  id: "rep-001",
  createdAt: "2026-03-30T23:00:00+08:00",
  range: makeRange("近 7 天", "last-7-days"),
  title: "近 7 天输入分析报告",
  summary: "近 7 天夜间输入更集中，输入分析与词库迁移相关词明显上升。",
  sections: [
    {
      id: "section-overview",
      kind: "overview",
      title: "总览",
      summary: "输入字数稳定增长，连续活跃 7 天。"
    },
    {
      id: "section-vocab",
      kind: "vocabulary",
      title: "词汇变化",
      summary: "共享契约与词库迁移成为新热点。"
    },
    {
      id: "section-time",
      kind: "time-activity",
      title: "时间分布",
      summary: "22:00 后是主要高峰时段。"
    }
  ],
  contentMasked: true
};

const normalScenario: FixtureScenario = {
  id: "normal-day",
  title: "普通日",
  description: "覆盖典型日常输入、两个会话、若干可读词汇信号。",
  range: makeRange("近 7 天", "last-7-days"),
  viewState: readyState,
  records: normalRecords,
  sessions: normalSessions,
  stats: makeStats(
    makeRange("近 7 天", "last-7-days"),
    [
      { key: "input-chars", label: "输入字数", value: 154, unit: "字", delta: 18, deltaLabel: "较上周期" },
      { key: "input-entries", label: "输入条数", value: 69, unit: "条" },
      { key: "active-days", label: "活跃天数", value: 7, unit: "天" },
      { key: "streak-days", label: "连续活跃", value: 7, unit: "天" },
      { key: "latest-input", label: "最近输入", value: "2026-03-30 22:28" },
      { key: "lexicon-size", label: "词库规模", value: 42, unit: "条" },
      { key: "new-terms", label: "新增词", value: 5, unit: "个" }
    ],
    ["夜间输入占比 41%", "最近 7 天保持连续活跃", "共享契约成为新增热点词"],
    [0, 0, 0, 0, 0, 0, 0, 6, 8, 16, 12, 0, 0, 0, 0, 8, 12, 10, 0, 0, 4, 12, 28, 18],
    {
      count: 11,
      averageDurationSeconds: 980,
      longestDurationSeconds: 2400,
      focusSessionCount: 3
    }
  ),
  vocabulary: normalVocabulary,
  lexicon: normalLexicon,
  report: normalReport,
  settings: baseSettings,
  lastOperation: baseOperation
};

const emptyScenario: FixtureScenario = {
  id: "empty-history",
  title: "空数据",
  description: "首次使用或记录尚未开始的状态。",
  range: makeRange("今天", "today"),
  viewState: noDataState,
  records: [],
  sessions: [],
  stats: {
    range: makeRange("今天", "today"),
    metrics: emptyMetrics(),
    timeline: [],
    hourlyBuckets: Array.from({ length: 24 }, (_, hour) => ({ hour, chars: 0, entries: 0 })),
    heatmap: [],
    sessionSummary: {
      count: 0,
      averageDurationSeconds: 0,
      longestDurationSeconds: 0,
      focusSessionCount: 0
    },
    highlights: ["暂无记录，等待采集模块写入事件。"]
  },
  vocabulary: [],
  lexicon: [],
  report: {
    id: "rep-empty",
    createdAt: "2026-03-30T23:00:00+08:00",
    range: makeRange("今天", "today"),
    title: "今日输入分析报告",
    summary: "暂无数据。",
    sections: [],
    contentMasked: true
  },
  settings: baseSettings,
  lastOperation: baseOperation
};

const powerUserScenario: FixtureScenario = {
  ...normalScenario,
  id: "power-user-day",
  title: "高活跃日",
  description: "高强度输入、长会话、词汇峰值明显。",
  stats: makeStats(
    makeRange("近 30 天", "last-30-days"),
    [
      { key: "input-chars", label: "输入字数", value: 1180, unit: "字", delta: 26, deltaLabel: "较上周期" },
      { key: "input-entries", label: "输入条数", value: 188, unit: "条" },
      { key: "active-days", label: "活跃天数", value: 24, unit: "天" },
      { key: "streak-days", label: "连续活跃", value: 12, unit: "天" },
      { key: "latest-input", label: "最近输入", value: "2026-03-30 23:41" },
      { key: "lexicon-size", label: "词库规模", value: 236, unit: "条" },
      { key: "new-terms", label: "新增词", value: 28, unit: "个" }
    ],
    ["22:00-01:00 输入高峰显著", "深度会话占比提升到 38%", "长词和短语输入增长明显"],
    [0, 0, 0, 0, 0, 0, 2, 10, 16, 28, 30, 20, 18, 12, 10, 18, 20, 24, 26, 18, 14, 36, 44, 52],
    {
      count: 32,
      averageDurationSeconds: 1420,
      longestDurationSeconds: 5400,
      focusSessionCount: 12
    }
  ),
  report: {
    ...normalReport,
    id: "rep-power",
    range: makeRange("近 30 天", "last-30-days"),
    title: "近 30 天输入分析报告",
    summary: "高强度输入集中在夜间，深度会话与词库增长同步上升。"
  }
};

const filteredScenario: FixtureScenario = {
  ...normalScenario,
  id: "filtered-day",
  title: "含过滤词",
  description: "包含敏感词过滤与应用黑名单后的空洞数据。",
  records: [
    ...normalRecords,
    {
      id: "evt-005",
      occurredAt: "2026-03-30T22:31:00+08:00",
      dateKey: "2026-03-30",
      timezone,
      schemaVersion: "1.0",
      source: "mock",
      appId: "com.bitwarden.desktop",
      appName: "Bitwarden",
      scope: "blocked",
      sessionId: null,
      rawText: null,
      maskedText: null,
      normalizedText: "",
      textLanguage: "mixed",
      charCount: 0,
      tokenCount: 0,
      candidateIndex: null,
      isDeleted: false,
      isFiltered: true,
      filterReasons: ["sensitive app"],
      tags: ["filtered"]
    }
  ],
  stats: makeStats(
    makeRange("今天", "today"),
    [
      { key: "input-chars", label: "输入字数", value: 53, unit: "字" },
      { key: "input-entries", label: "输入条数", value: 4, unit: "条" },
      { key: "active-days", label: "活跃天数", value: 1, unit: "天" },
      { key: "streak-days", label: "连续活跃", value: 1, unit: "天" }
    ],
    ["已过滤 1 条敏感应用输入", "过滤后仍保留统计完整性"],
    [0, 0, 0, 0, 0, 0, 0, 0, 8, 12, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 8, 20, 10],
    {
      count: 2,
      averageDurationSeconds: 1200,
      longestDurationSeconds: 1800,
      focusSessionCount: 1
    }
  ),
  report: {
    ...normalReport,
    id: "rep-filtered",
    range: makeRange("今天", "today"),
    title: "今日输入分析报告",
    summary: "存在过滤事件，导出时应默认脱敏。"
  }
};

export const fixtureScenarios: FixtureScenario[] = [
  emptyScenario,
  normalScenario,
  powerUserScenario,
  filteredScenario
];

export const fixtureScenarioMap = new Map(
  fixtureScenarios.map((scenario) => [scenario.id, scenario])
);

export const createBootstrapFromScenario = (
  scenario: FixtureScenario
): DashboardBootstrap => {
  const vocabularyPage: VocabularyPageData = {
    range: scenario.range,
    viewState: scenario.viewState,
    topTerms: scenario.vocabulary.filter((item) => item.kind === "top"),
    newTerms: scenario.vocabulary.filter((item) => item.kind === "new"),
    risingTerms: scenario.vocabulary.filter((item) => item.kind === "rising"),
    fallingTerms: scenario.vocabulary.filter((item) => item.kind === "falling"),
    phraseTerms: scenario.vocabulary.filter((item) => item.kind === "phrase")
  };

  const timeActivityPage: TimeActivityPageData = {
    range: scenario.range,
    viewState: scenario.viewState,
    hourlyBuckets: scenario.stats.hourlyBuckets,
    heatmap: scenario.stats.heatmap,
    sessions: scenario.stats.sessionSummary
  };

  const governancePage: GovernancePageData = {
    settings: scenario.settings,
    lastOperation: scenario.lastOperation,
    viewState: scenario.viewState
  };

  return {
    scenarioId: scenario.id,
    overview: {
      range: scenario.range,
      viewState: scenario.viewState,
      metrics: scenario.stats.metrics,
      highlights: scenario.stats.highlights,
      timeline: scenario.stats.timeline
    },
    vocabulary: vocabularyPage,
    timeActivity: timeActivityPage,
    governance: governancePage,
    report: scenario.report
  };
};
