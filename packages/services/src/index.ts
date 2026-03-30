import type {
  DashboardBootstrap,
  DashboardQuery,
  FixtureScenario,
  InputRecordEvent,
  LexiconEntry,
  LexiconExportOperation,
  LexiconExportResult,
  LexiconFilterCategory,
  LexiconListRequest,
  LexiconListResult,
  LexiconMigrationGuideRequest,
  LexiconMutationOperation,
  LexiconMutationResult,
  LexiconOverview,
  LexiconQuery,
  LexiconScenarioRequest,
  MigrationGuide,
  ViewState,
  VocabularyInsight
} from "../../contracts/src/index";
import { analyzeScenario } from "../../analytics/src/index";
import { fixtureScenarios } from "../../mock-data/src/index";
import { createGovernanceService } from "./governance";
import { createIngestionService } from "./ingestion";

const defaultScenarioId = "normal-day";

const HIGH_FREQUENCY_THRESHOLD = 5;
const LOW_FREQUENCY_THRESHOLD = 2;
const NEW_WINDOW_DAYS = 7;
const STALE_WINDOW_DAYS = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const cloneScenario = (scenario: FixtureScenario): FixtureScenario =>
  JSON.parse(JSON.stringify(scenario)) as FixtureScenario;

const resolveScenarioFromStore = (
  scenarioStore: Map<string, FixtureScenario>,
  scenarioId: string
): FixtureScenario =>
  scenarioStore.get(scenarioId) ?? scenarioStore.get(defaultScenarioId)!;

const daysSince = (at: string, referenceAt: string): number => {
  const atMs = new Date(at).getTime();
  const referenceMs = new Date(referenceAt).getTime();

  return Math.floor((referenceMs - atMs) / MILLISECONDS_PER_DAY);
};

const resolveReferenceAt = (
  scenario: FixtureScenario,
  preferred?: string
): string => {
  if (preferred) {
    return preferred;
  }

  if (scenario.lexicon.length === 0) {
    return scenario.range.endAt ?? new Date().toISOString();
  }

  return scenario.lexicon.reduce((latest, entry) => {
    const latestMs = new Date(latest).getTime();
    const currentMs = new Date(entry.lastSeenAt).getTime();

    return currentMs > latestMs ? entry.lastSeenAt : latest;
  }, scenario.lexicon[0]!.lastSeenAt);
};

const isNewEntry = (entry: LexiconEntry, referenceAt: string): boolean => {
  const days = daysSince(entry.firstSeenAt, referenceAt);

  return days >= 0 && days <= NEW_WINDOW_DAYS;
};

const isHighFrequencyEntry = (entry: LexiconEntry): boolean =>
  entry.usageCount >= HIGH_FREQUENCY_THRESHOLD;

const isActionableEntry = (entry: LexiconEntry): boolean =>
  entry.status !== "ignored" && entry.status !== "deleted";

const isLowFrequencyStaleEntry = (
  entry: LexiconEntry,
  referenceAt: string
): boolean => {
  const days = daysSince(entry.lastSeenAt, referenceAt);

  return (
    isActionableEntry(entry) &&
    entry.usageCount <= LOW_FREQUENCY_THRESHOLD &&
    days > STALE_WINDOW_DAYS
  );
};

const isHighFrequencyNewEntry = (
  entry: LexiconEntry,
  referenceAt: string
): boolean =>
  isActionableEntry(entry) &&
  isHighFrequencyEntry(entry) &&
  isNewEntry(entry, referenceAt);

const matchesCategory = (
  entry: LexiconEntry,
  category: LexiconFilterCategory,
  referenceAt: string
): boolean => {
  switch (category) {
    case "all":
      return true;
    case "high-frequency":
      return isHighFrequencyEntry(entry);
    case "new":
      return isNewEntry(entry, referenceAt);
    case "low-frequency-stale":
      return isLowFrequencyStaleEntry(entry, referenceAt);
    case "phrase":
      return entry.category === "phrase";
    case "favorite":
      return entry.status === "favorite";
    case "ignored":
      return entry.status === "ignored";
    case "deleted":
      return entry.status === "deleted";
    case "domain":
    case "general":
    case "noise":
      return entry.category === category;
  }
};

const matchesSearch = (entry: LexiconEntry, search: string): boolean => {
  const needle = search.trim().toLowerCase();

  if (needle.length === 0) {
    return true;
  }

  return [entry.term, entry.normalizedTerm, entry.notes ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(needle);
};

const sortEntries = (
  entries: LexiconEntry[],
  query: LexiconQuery
): LexiconEntry[] => {
  const sorted = [...entries].sort((left, right) => {
    if (query.sortBy === "usage-count") {
      return left.usageCount - right.usageCount;
    }

    if (query.sortBy === "first-seen") {
      return new Date(left.firstSeenAt).getTime() - new Date(right.firstSeenAt).getTime();
    }

    if (query.sortBy === "last-seen") {
      return new Date(left.lastSeenAt).getTime() - new Date(right.lastSeenAt).getTime();
    }

    return left.term.localeCompare(right.term, "zh-Hans-CN");
  });

  return query.sortOrder === "asc" ? sorted : sorted.reverse();
};

const listEntriesByQuery = (
  scenario: FixtureScenario,
  query: LexiconQuery
): LexiconListResult => {
  const referenceAt = resolveReferenceAt(scenario, query.referenceAt);

  const filtered = scenario.lexicon.filter(
    (entry) =>
      matchesCategory(entry, query.category, referenceAt) &&
      matchesSearch(entry, query.search)
  );

  const sorted = sortEntries(filtered, query);
  const offset = query.offset ?? 0;
  const limit = query.limit ?? sorted.length;

  return {
    entries: sorted.slice(offset, offset + limit),
    total: filtered.length
  };
};

const getOverview = (
  scenario: FixtureScenario,
  referenceAt: string
): LexiconOverview => ({
  totalEntries: scenario.lexicon.length,
  newEntries: scenario.lexicon.filter((entry) => isNewEntry(entry, referenceAt)).length,
  highFrequencyEntries: scenario.lexicon.filter((entry) => isHighFrequencyEntry(entry)).length,
  lowFrequencyStaleEntries: scenario.lexicon.filter((entry) =>
    isLowFrequencyStaleEntry(entry, referenceAt)
  ).length,
  phraseEntries: scenario.lexicon.filter((entry) => entry.category === "phrase").length,
  favoriteEntries: scenario.lexicon.filter((entry) => entry.status === "favorite").length,
  ignoredEntries: scenario.lexicon.filter((entry) => entry.status === "ignored").length,
  deletedEntries: scenario.lexicon.filter((entry) => entry.status === "deleted").length
});

const toTsvContent = (entries: LexiconEntry[]): string => {
  const header = "term\tusageCount\tcategory\tstatus";
  const lines = entries.map(
    (entry) =>
      `${entry.term}\t${entry.usageCount}\t${entry.category}\t${entry.status}`
  );

  return [header, ...lines].join("\n");
};

const toRimeContent = (
  entries: LexiconEntry[],
  scenarioId: string,
  generatedAt: string
): string => {
  const header = [
    "# Rime dictionary export",
    `# scenario: ${scenarioId}`,
    `# generatedAt: ${generatedAt}`
  ];
  const body = entries.map(
    (entry) => `${entry.term}\t${Math.max(1, entry.usageCount)}`
  );

  return [...header, ...body].join("\n");
};

const toJsonContent = (entries: LexiconEntry[]): string =>
  JSON.stringify(entries, null, 2);

const mutateEntries = (
  scenario: FixtureScenario,
  operation: LexiconMutationOperation
): LexiconMutationResult => {
  const warnings: string[] = [];
  const byId = new Map(
    scenario.lexicon.map((entry) => [entry.id, { ...entry }])
  );
  const updated: LexiconEntry[] = [];

  operation.request.entryIds.forEach((entryId) => {
    const entry = byId.get(entryId);

    if (!entry) {
      warnings.push(`entry ${entryId} not found`);
      return;
    }

    switch (operation.request.action) {
      case "favorite":
        entry.status = "favorite";
        break;
      case "unfavorite":
        entry.status = "active";
        break;
      case "delete":
        entry.status = "deleted";
        break;
      case "restore":
        entry.status = "active";
        break;
      case "ignore":
        entry.status = "ignored";
        break;
      case "unignore":
        entry.status = "active";
        break;
      case "mark-phrase":
        entry.category = "phrase";
        break;
      case "set-category":
        if (!operation.request.category) {
          warnings.push(`entry ${entryId} missing category for set-category`);
          return;
        }
        entry.category = operation.request.category;
        break;
    }

    updated.push(entry);
  });

  scenario.lexicon = scenario.lexicon.map((entry) => byId.get(entry.id) ?? entry);

  return {
    action: operation.request.action,
    updatedCount: updated.length,
    entries: updated,
    warnings
  };
};

const exportEntries = (
  scenario: FixtureScenario,
  operation: LexiconExportOperation
): LexiconExportResult => {
  const query: LexiconQuery = {
    category: operation.request.category,
    search: operation.request.search ?? "",
    sortBy: "usage-count",
    sortOrder: "desc",
    referenceAt: operation.request.referenceAt
  };

  const listed = listEntriesByQuery(scenario, query);
  const selected = operation.request.entryIds?.length
    ? listed.entries.filter((entry) =>
        operation.request.entryIds?.includes(entry.id)
      )
    : listed.entries;
  const generatedAt = new Date().toISOString();

  const content =
    operation.request.format === "json"
      ? toJsonContent(selected)
      : operation.request.format === "tsv"
        ? toTsvContent(selected)
        : toRimeContent(selected, scenario.id, generatedAt);

  return {
    format: operation.request.format,
    content,
    exportedCount: selected.length,
    generatedAt,
    scenarioId: scenario.id
  };
};

const getMigrationGuide = (
  request: LexiconMigrationGuideRequest
): MigrationGuide => {
  if (request.format === "json") {
    return {
      format: "json",
      title: "结构化迁移（JSON）",
      steps: [
        "导出 JSON 文件并保存在本地安全目录。",
        "在目标系统导入词条并映射 category/status 字段。",
        "导入后抽样检查高频词和短语词是否完整。"
      ],
      notes: [
        `来源场景：${request.scenarioId}`,
        "JSON 保留元数据最完整，适合作为主备份格式。"
      ]
    };
  }

  if (request.format === "tsv") {
    return {
      format: "tsv",
      title: "通用词表迁移（TSV）",
      steps: [
        "导出 TSV 文件。",
        "在目标平台选择 Tab 分隔导入。",
        "按 usageCount 调整权重或排序规则。"
      ],
      notes: [
        `来源场景：${request.scenarioId}`,
        "TSV 兼容性高，但会丢失部分扩展字段。"
      ]
    };
  }

  return {
    format: "rime",
    title: "Rime 词库迁移",
    steps: [
      "导出 rime 格式文本。",
      "将导出内容保存到 Rime 自定义词库文件。",
      "执行重新部署并验证候选排序是否符合预期。"
    ],
    notes: [
      `来源场景：${request.scenarioId}`,
      "若词条较多，建议先在小样本环境验证后再全量导入。"
    ]
  };
};

const noDataViewState: ViewState = {
  code: "NO_DATA",
  title: "暂无输入记录",
  description: "可以先导入样例数据，或等待记录模块开始写入。"
};

const emptyResultViewState: ViewState = {
  code: "EMPTY_RESULT",
  title: "过滤后无可展示结果",
  description: "当前筛选范围内没有可分析记录，可切换时间范围或检查过滤策略。"
};

const isUsableRecord = (record: InputRecordEvent): boolean =>
  !record.isDeleted && !record.isFiltered && record.normalizedText.trim().length > 0;

const resolveDashboardViewState = (
  scenario: FixtureScenario,
  recordsInRange: InputRecordEvent[]
): ViewState => {
  if (
    scenario.viewState.code === "PAUSED" ||
    scenario.viewState.code === "PERMISSION_DENIED" ||
    scenario.viewState.code === "ERROR"
  ) {
    return scenario.viewState;
  }

  if (scenario.records.length === 0) {
    return noDataViewState;
  }

  if (recordsInRange.length === 0) {
    return emptyResultViewState;
  }

  const usableCount = recordsInRange.filter(isUsableRecord).length;
  if (usableCount === 0) {
    return emptyResultViewState;
  }

  return {
    code: "READY",
    title: "数据可用",
    description: "当前时间范围内有可展示的输入与分析结果。"
  };
};

const mergeTopTermsForDisplay = (
  topTerms: VocabularyInsight[],
  phraseTerms: VocabularyInsight[],
  lexicon: LexiconEntry[]
): VocabularyInsight[] => {
  const preferredTerms = new Set(
    lexicon
      .filter((entry) => entry.status !== "ignored" && entry.status !== "deleted")
      .map((entry) => entry.normalizedTerm.trim())
      .filter(Boolean)
  );

  const ranked = [...phraseTerms, ...topTerms].sort((left, right) => {
    const leftPreferred = preferredTerms.has(left.normalizedTerm) ? 1 : 0;
    const rightPreferred = preferredTerms.has(right.normalizedTerm) ? 1 : 0;
    if (leftPreferred !== rightPreferred) {
      return rightPreferred - leftPreferred;
    }

    const countDiff = right.count - left.count;
    if (countDiff !== 0) {
      return countDiff;
    }

    const deltaDiff = right.deltaFromPrevious - left.deltaFromPrevious;
    if (deltaDiff !== 0) {
      return deltaDiff;
    }

    return left.term.localeCompare(right.term, "zh-Hans-CN");
  });

  const merged: VocabularyInsight[] = [];
  const seenTerms = new Set<string>();

  ranked.forEach((item) => {
    const normalized = item.normalizedTerm.trim();
    if (!normalized || seenTerms.has(normalized)) {
      return;
    }

    seenTerms.add(normalized);
    merged.push({
      ...item,
      id: `top-${normalized}`,
      kind: "top"
    });
  });

  return merged.slice(0, 20);
};

const alignHighlightsWithTopTerms = (
  highlights: string[],
  topTerms: VocabularyInsight[]
): string[] => {
  const preferred = topTerms[0];

  if (!preferred) {
    return highlights;
  }

  let replaced = false;

  const nextHighlights = highlights.map((line) => {
    if (!line.startsWith("高频词：")) {
      return line;
    }

    replaced = true;
    return `高频词：${preferred.term}（${preferred.count} 次）`;
  });

  return replaced
    ? nextHighlights
    : [...nextHighlights, `高频词：${preferred.term}（${preferred.count} 次）`];
};

export const createServiceRegistry = () => {
  const scenarioStore = new Map(
    fixtureScenarios.map((scenario) => [scenario.id, cloneScenario(scenario)])
  );

  const resolveScenario = (scenarioId: string): FixtureScenario =>
    resolveScenarioFromStore(scenarioStore, scenarioId);

  const governance = createGovernanceService({
    resolveScenario
  });

  return {
    meta: {
      async listFixtureScenarios(): Promise<string[]> {
        return Array.from(scenarioStore.keys());
      }
    },
    ingestion: createIngestionService(),
    governance,
    dashboard: {
      async getDashboardBootstrap(
        query: DashboardQuery
      ): Promise<DashboardBootstrap> {
        const scenario = resolveScenario(query.scenarioId);

        const analyzed = analyzeScenario({
          scenario,
          preset: query.preset,
          nowIso: scenario.range.endAt
        });

        const dashboardViewState = resolveDashboardViewState(
          scenario,
          analyzed.currentRecords
        );
        const displayTopTerms = mergeTopTermsForDisplay(
          analyzed.vocabulary.topTerms,
          analyzed.vocabulary.phraseTerms,
          scenario.lexicon
        );
        const overviewHighlights = alignHighlightsWithTopTerms(
          analyzed.highlights,
          displayTopTerms
        );

        return {
          scenarioId: scenario.id,
          overview: {
            range: analyzed.range,
            viewState: dashboardViewState,
            metrics: analyzed.stats.metrics,
            highlights: overviewHighlights,
            timeline: analyzed.stats.timeline
          },
          vocabulary: {
            range: analyzed.range,
            viewState: dashboardViewState,
            topTerms: displayTopTerms,
            newTerms: analyzed.vocabulary.newTerms,
            risingTerms: analyzed.vocabulary.risingTerms,
            fallingTerms: analyzed.vocabulary.fallingTerms,
            phraseTerms: analyzed.vocabulary.phraseTerms
          },
          timeActivity: {
            range: analyzed.range,
            viewState: dashboardViewState,
            hourlyBuckets: analyzed.stats.hourlyBuckets,
            heatmap: analyzed.stats.heatmap,
            sessions: analyzed.sessionSummary
          },
          governance: {
            settings: scenario.settings,
            lastOperation: scenario.lastOperation,
            viewState: scenario.viewState
          },
          report: {
            ...scenario.report,
            range: analyzed.range,
            summary: overviewHighlights.slice(0, 3).join("；")
          }
        };
      }
    },
    lexicon: {
      async getOverview(
        request: LexiconScenarioRequest
      ): Promise<LexiconOverview> {
        const scenario = resolveScenario(request.scenarioId);
        const referenceAt = resolveReferenceAt(scenario, request.referenceAt);

        return getOverview(scenario, referenceAt);
      },

      async listEntries(request: LexiconListRequest): Promise<LexiconListResult> {
        const scenario = resolveScenario(request.scenarioId);

        return listEntriesByQuery(scenario, request.query);
      },

      async identifyLowFrequencyStale(
        request: LexiconScenarioRequest
      ): Promise<LexiconEntry[]> {
        const scenario = resolveScenario(request.scenarioId);
        const referenceAt = resolveReferenceAt(scenario, request.referenceAt);

        return scenario.lexicon.filter((entry) =>
          isLowFrequencyStaleEntry(entry, referenceAt)
        );
      },

      async identifyHighFrequencyNew(
        request: LexiconScenarioRequest
      ): Promise<LexiconEntry[]> {
        const scenario = resolveScenario(request.scenarioId);
        const referenceAt = resolveReferenceAt(scenario, request.referenceAt);

        return scenario.lexicon.filter((entry) =>
          isHighFrequencyNewEntry(entry, referenceAt)
        );
      },

      async mutateEntries(
        operation: LexiconMutationOperation
      ): Promise<LexiconMutationResult> {
        const scenario = resolveScenario(operation.scenarioId);

        return mutateEntries(scenario, operation);
      },

      async exportEntries(
        operation: LexiconExportOperation
      ): Promise<LexiconExportResult> {
        const scenario = resolveScenario(operation.scenarioId);

        return exportEntries(scenario, operation);
      },

      async getMigrationGuide(
        request: LexiconMigrationGuideRequest
      ): Promise<MigrationGuide> {
        const scenario = resolveScenario(request.scenarioId);

        return getMigrationGuide({
          ...request,
          scenarioId: scenario.id
        });
      }
    }
  };
};
