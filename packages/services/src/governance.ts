import type {
  FilterRule,
  FixtureScenario,
  GovernanceConfirmationPolicy,
  GovernanceDeleteRequest,
  GovernanceExportOutput,
  GovernanceExportRequest,
  GovernanceNotice,
  GovernancePauseRequest,
  GovernanceRetainRequest,
  GovernanceRuleUpsertRequest,
  GovernanceRecordingSwitchRequest,
  GovernanceScenarioRequest,
  GovernanceSettingsCenter,
  GovernanceStopWordsRequest,
  InputRecordEvent,
  OperationEnvelope,
  OperationError,
  PrivacyMode,
  SessionSummary,
  StatsSnapshot,
  UserSettings,
  VocabularyInsight,
  ViewState
} from "../../contracts/src/index";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const defaultViewState: ViewState = {
  code: "READY",
  title: "数据可用",
  description: "当前时间范围内有可展示的输入与分析结果。"
};

const createRequestId = (operation: string): string =>
  `gov-${operation}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return "-";
  }

  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return "-";
  }

  return `${value.slice(0, 10)} ${value.slice(11, 16)}`;
};

const parseTime = (value: string): number | null => {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return timestamp;
};

const twoHourBucketLabel = (hour: number): string => {
  const startHour = Math.floor(hour / 2) * 2;
  const endHour = startHour + 1;
  const start = startHour.toString().padStart(2, "0");
  const end = endHour.toString().padStart(2, "0");

  return `${start}:00-${end}:59`;
};

const computeStreakDays = (dateKeys: string[]): number => {
  if (dateKeys.length === 0) {
    return 0;
  }

  const sorted = [...dateKeys].sort();
  let streak = 1;

  for (let index = sorted.length - 1; index > 0; index -= 1) {
    const current = parseTime(`${sorted[index]}T00:00:00Z`);
    const previous = parseTime(`${sorted[index - 1]}T00:00:00Z`);

    if (current === null || previous === null) {
      break;
    }

    if (current - previous === DAY_IN_MS) {
      streak += 1;
      continue;
    }

    break;
  }

  return streak;
};

const maskText = (value: string | null): string | null => {
  if (!value || value.trim().length === 0) {
    return value;
  }

  return "[MASKED]";
};

const buildScopeSummary = (settings: UserSettings): string => {
  const appRules = settings.filterRules.filter(
    (rule) => rule.enabled && rule.type === "app"
  ).length;

  if (!settings.recordingEnabled) {
    return "记录总开关已关闭，不再采集新输入。";
  }

  if (settings.paused) {
    return `记录已暂停：${settings.pauseReason ?? "手动暂停"}`;
  }

  if (appRules > 0) {
    return `当前记录范围为默认已上屏输入，已屏蔽 ${appRules} 个应用规则。`;
  }

  return "当前记录范围为默认已上屏输入，未配置应用黑名单。";
};

const buildRetentionSummary = (settings: UserSettings): string => {
  const modeLabel =
    settings.retention.mode === "store-raw"
      ? "保留原文"
      : settings.retention.mode === "store-masked"
        ? "仅保留脱敏文本"
        : "仅保留统计";

  const dayLabel =
    settings.retention.retentionDays === null
      ? "不按天数清理"
      : `保留最近 ${settings.retention.retentionDays} 天`;

  const archiveLabel = settings.retention.autoArchive
    ? "自动归档已开启"
    : "自动归档已关闭";

  const exportLabel = settings.retention.exportMaskingEnabled
    ? "导出默认脱敏"
    : "导出可保留原文";

  return `${modeLabel}；${dayLabel}；${archiveLabel}；${exportLabel}。`;
};

const buildNotices = (settings: UserSettings): GovernanceNotice[] => {
  const notices: GovernanceNotice[] = [];

  if (settings.paused || !settings.recordingEnabled) {
    notices.push({
      id: "notice-recording-paused",
      level: "warning",
      title: "记录未处于运行状态",
      message: "当前不会新增输入记录，建议确认是否需要恢复记录。"
    });
  }

  if (settings.retention.mode === "stats-only") {
    notices.push({
      id: "notice-stats-only",
      level: "critical",
      title: "仅保留统计模式已开启",
      message: "原文和脱敏文本将不可恢复，请在操作前确认。"
    });
  }

  notices.push({
    id: "notice-export-masking",
    level: settings.retention.exportMaskingEnabled ? "info" : "warning",
    title: "导出脱敏策略",
    message: settings.retention.exportMaskingEnabled
      ? "导出默认脱敏，降低内容暴露风险。"
      : "导出可包含可读文本，请谨慎分享导出文件。"
  });

  return notices;
};

const confirmationPolicy: GovernanceConfirmationPolicy = {
  deleteRequiresConfirmation: true,
  deleteAllRequiresSecondConfirmation: true,
  exportDefaultsToMasked: true
};

const buildSettingsCenter = (scenario: FixtureScenario): GovernanceSettingsCenter => ({
  settings: scenario.settings,
  lastOperation: scenario.lastOperation,
  recordingScopeSummary: buildScopeSummary(scenario.settings),
  retentionSummary: buildRetentionSummary(scenario.settings),
  notices: buildNotices(scenario.settings),
  confirmationPolicy
});

const createError = (
  code: OperationError["code"],
  message: string,
  details?: Record<string, unknown>
): OperationError => ({
  code,
  message,
  details
});

const createEnvelope = <TInput, TOutput>(
  operation: OperationEnvelope<TInput, TOutput>["operation"],
  input: TInput,
  success: boolean,
  output: TOutput | undefined,
  errors: OperationError[]
): OperationEnvelope<TInput, TOutput> => ({
  requestId: createRequestId(operation),
  operation,
  input,
  output,
  success,
  errors,
  performedAt: new Date().toISOString()
});

const evaluateRule = (
  rule: FilterRule,
  record: InputRecordEvent,
  text: string
): string | null => {
  if (!rule.enabled) {
    return null;
  }

  if (rule.type === "app") {
    const appId = record.appId.toLowerCase();
    const appName = record.appName.toLowerCase();
    const needle = rule.pattern.toLowerCase();

    if (appId.includes(needle) || appName.includes(needle)) {
      return rule.reason;
    }

    return null;
  }

  if (rule.type === "term") {
    if (text.includes(rule.pattern)) {
      return rule.reason;
    }

    return null;
  }

  try {
    const regex = new RegExp(rule.pattern, "i");

    if (regex.test(text)) {
      return rule.reason;
    }

    return null;
  } catch {
    return null;
  }
};

const applyRetentionMode = (
  record: InputRecordEvent,
  mode: PrivacyMode
): void => {
  if (mode === "store-raw") {
    return;
  }

  record.rawText = null;

  if (mode === "store-masked") {
    record.maskedText = maskText(record.maskedText ?? record.normalizedText);
    return;
  }

  record.maskedText = null;
  record.normalizedText = "";
};

const applyRetentionWindow = (scenario: FixtureScenario): number => {
  if (
    !scenario.settings.retention.autoArchive ||
    scenario.settings.retention.retentionDays === null
  ) {
    return 0;
  }

  const latest = scenario.records.reduce((latestTimestamp, record) => {
    const current = parseTime(record.occurredAt);

    if (current === null) {
      return latestTimestamp;
    }

    return current > latestTimestamp ? current : latestTimestamp;
  }, 0);

  if (latest === 0) {
    return 0;
  }

  const windowStart = latest - scenario.settings.retention.retentionDays * DAY_IN_MS;
  let archivedCount = 0;

  scenario.records.forEach((record) => {
    const occurredAt = parseTime(record.occurredAt);

    if (
      occurredAt !== null &&
      occurredAt < windowStart &&
      !record.isDeleted
    ) {
      record.isDeleted = true;
      archivedCount += 1;
    }
  });

  return archivedCount;
};

const syncVocabulary = (
  scenario: FixtureScenario,
  activeEventIds: Set<string>
): VocabularyInsight[] => {
  const fromFixture = scenario.vocabulary
    .map((item) => {
      const sourceEventIds = item.sourceEventIds.filter((id) => activeEventIds.has(id));

      if (sourceEventIds.length === 0) {
        return null;
      }

      return {
        ...item,
        count: sourceEventIds.length,
        sourceEventIds
      };
    })
    .filter((item): item is VocabularyInsight => item !== null);

  if (fromFixture.length > 0) {
    const total = fromFixture.reduce((sum, item) => sum + item.count, 0);

    return fromFixture.map((item) => ({
      ...item,
      share: total === 0 ? 0 : Number((item.count / total).toFixed(4))
    }));
  }

  const fallbackMap = new Map<string, { count: number; firstSeenAt: string; lastSeenAt: string; sourceEventIds: string[] }>();

  scenario.records
    .filter((record) => activeEventIds.has(record.id))
    .forEach((record) => {
      const term = record.maskedText ?? record.normalizedText;

      if (!term || term.trim().length === 0) {
        return;
      }

      const existing = fallbackMap.get(term);

      if (!existing) {
        fallbackMap.set(term, {
          count: 1,
          firstSeenAt: record.occurredAt,
          lastSeenAt: record.occurredAt,
          sourceEventIds: [record.id]
        });
        return;
      }

      existing.count += 1;
      existing.lastSeenAt = record.occurredAt;
      existing.sourceEventIds.push(record.id);
    });

  const rows = Array.from(fallbackMap.entries())
    .sort((left, right) => right[1].count - left[1].count)
    .slice(0, 5);
  const total = rows.reduce((sum, row) => sum + row[1].count, 0);

  return rows.map(([term, value], index) => ({
    id: `generated-${index + 1}`,
    term,
    normalizedTerm: term,
    kind: index === 0 ? "top" : "rising",
    count: value.count,
    share: total === 0 ? 0 : Number((value.count / total).toFixed(4)),
    deltaFromPrevious: 0,
    firstSeenAt: value.firstSeenAt,
    lastSeenAt: value.lastSeenAt,
    isStopWord: false,
    sourceEventIds: value.sourceEventIds
  }));
};

const buildViewState = (
  scenario: FixtureScenario,
  activeRecordCount: number
): ViewState => {
  if (!scenario.settings.recordingEnabled) {
    return {
      code: "PAUSED",
      title: "记录已关闭",
      description: "记录总开关已关闭，系统不会继续采集新输入。"
    };
  }

  if (scenario.settings.paused) {
    return {
      code: "PAUSED",
      title: "记录已暂停",
      description: scenario.settings.pauseReason
        ? `记录暂停中：${scenario.settings.pauseReason}`
        : "记录暂停中，可随时恢复。"
    };
  }

  if (activeRecordCount === 0) {
    return {
      code: "NO_DATA",
      title: "暂无可分析记录",
      description: "当前时间范围内没有可用于分析的输入记录。"
    };
  }

  return {
    ...defaultViewState
  };
};

const recalculateScenario = (
  scenario: FixtureScenario,
  archivedCount: number
): { activeRecords: InputRecordEvent[]; filteredCount: number } => {
  scenario.records.forEach((record) => {
    applyRetentionMode(record, scenario.settings.retention.mode);

    const text = (record.normalizedText ?? "").trim();
    const reasons = new Set<string>();

    if (record.tags.includes("manual-ignore")) {
      reasons.add("manual-ignore");
    }

    scenario.settings.filterRules.forEach((rule) => {
      const reason = evaluateRule(rule, record, text);

      if (reason) {
        reasons.add(reason);
      }
    });

    if (text.length > 0 && scenario.settings.stopWords.includes(text)) {
      reasons.add("stop-word");
    }

    record.filterReasons = Array.from(reasons);
    record.isFiltered = record.filterReasons.length > 0;

    if (!record.isFiltered) {
      record.scope = "allow";
    } else {
      const appRuleHit = scenario.settings.filterRules.some(
        (rule) =>
          rule.enabled &&
          rule.type === "app" &&
          evaluateRule(rule, record, text) !== null
      );

      record.scope = appRuleHit ? "blocked" : "ignored";
    }
  });

  const activeRecords = scenario.records.filter(
    (record) => !record.isDeleted && !record.isFiltered && record.charCount > 0
  );
  const filteredCount = scenario.records.filter(
    (record) => !record.isDeleted && record.isFiltered
  ).length;

  const activeEventIds = new Set(activeRecords.map((record) => record.id));
  const dateKeys = Array.from(new Set(activeRecords.map((record) => record.dateKey)));

  const latestInput = activeRecords.reduce<string | null>((latest, record) => {
    if (!latest) {
      return record.occurredAt;
    }

    return record.occurredAt > latest ? record.occurredAt : latest;
  }, null);

  const timelineMap = new Map<string, { chars: number; entries: number; tokens: number }>();

  activeRecords.forEach((record) => {
    const current = timelineMap.get(record.dateKey) ?? {
      chars: 0,
      entries: 0,
      tokens: 0
    };

    current.chars += record.charCount;
    current.entries += 1;
    current.tokens += record.tokenCount;

    timelineMap.set(record.dateKey, current);
  });

  const hourlyBuckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    chars: 0,
    entries: 0
  }));

  const heatmapMap = new Map<string, number>();

  activeRecords.forEach((record) => {
    const occurredAt = parseTime(record.occurredAt);

    if (occurredAt === null) {
      return;
    }

    const hour = new Date(occurredAt).getHours();
    hourlyBuckets[hour].chars += record.charCount;
    hourlyBuckets[hour].entries += 1;

    const bucketLabel = twoHourBucketLabel(hour);
    const key = `${record.dateKey}|${bucketLabel}`;
    const current = heatmapMap.get(key) ?? 0;

    heatmapMap.set(key, current + record.charCount);
  });

  const availableSessions = scenario.sessions.filter((session) =>
    session.eventIds.some((eventId) => activeEventIds.has(eventId))
  );

  const sessionSummary: SessionSummary = {
    count: availableSessions.length,
    averageDurationSeconds:
      availableSessions.length === 0
        ? 0
        : Math.round(
            availableSessions.reduce((sum, session) => sum + session.durationSeconds, 0) /
              availableSessions.length
          ),
    longestDurationSeconds: availableSessions.reduce(
      (max, session) => (session.durationSeconds > max ? session.durationSeconds : max),
      0
    ),
    focusSessionCount: availableSessions.filter(
      (session) => session.intensity === "deep-focus"
    ).length
  };

  const labels = new Map(
    scenario.stats.metrics.map((metric) => [metric.key, metric.label])
  );
  const metrics: StatsSnapshot["metrics"] = [
    {
      key: "input-chars",
      label: labels.get("input-chars") ?? "输入字数",
      value: activeRecords.reduce((sum, record) => sum + record.charCount, 0),
      unit: "字"
    },
    {
      key: "input-entries",
      label: labels.get("input-entries") ?? "输入条数",
      value: activeRecords.length,
      unit: "条"
    },
    {
      key: "active-days",
      label: labels.get("active-days") ?? "活跃天数",
      value: dateKeys.length,
      unit: "天"
    },
    {
      key: "streak-days",
      label: labels.get("streak-days") ?? "连续活跃",
      value: computeStreakDays(dateKeys),
      unit: "天"
    },
    {
      key: "latest-input",
      label: labels.get("latest-input") ?? "最近输入",
      value: formatDateTime(latestInput)
    },
    {
      key: "lexicon-size",
      label: labels.get("lexicon-size") ?? "词库规模",
      value: scenario.lexicon.filter((entry) => entry.status !== "deleted").length,
      unit: "条"
    },
    {
      key: "new-terms",
      label: labels.get("new-terms") ?? "新增词",
      value: scenario.vocabulary.filter((item) => item.kind === "new").length,
      unit: "个"
    }
  ];

  const highlights: string[] = [];

  if (!scenario.settings.recordingEnabled) {
    highlights.push("记录总开关已关闭。开启后才会继续采集。");
  }

  if (scenario.settings.paused) {
    highlights.push(`记录暂停中：${scenario.settings.pauseReason ?? "手动暂停"}`);
  }

  if (filteredCount > 0) {
    highlights.push(`已过滤 ${filteredCount} 条命中规则的记录。`);
  }

  if (archivedCount > 0) {
    highlights.push(`已按保留策略归档 ${archivedCount} 条历史记录。`);
  }

  if (activeRecords.length === 0) {
    highlights.push("暂无可用于分析的记录。");
  } else {
    highlights.push(`当前可分析记录 ${activeRecords.length} 条。`);
  }

  scenario.stats = {
    ...scenario.stats,
    metrics,
    timeline: Array.from(timelineMap.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([bucket, value]) => ({
        bucket,
        chars: value.chars,
        entries: value.entries,
        tokens: value.tokens
      })),
    hourlyBuckets,
    heatmap: Array.from(heatmapMap.entries()).map(([key, chars]) => {
      const [dateKey, bucketLabel] = key.split("|");

      return {
        dateKey,
        bucketLabel,
        chars
      };
    }),
    sessionSummary,
    highlights
  };

  scenario.vocabulary = syncVocabulary(scenario, activeEventIds);
  scenario.report = {
    ...scenario.report,
    summary:
      activeRecords.length === 0
        ? "当前时间范围暂无可展示输入，治理策略已生效。"
        : `当前保留 ${activeRecords.length} 条输入记录，过滤 ${filteredCount} 条。`,
    contentMasked:
      scenario.settings.retention.mode !== "store-raw" ||
      scenario.settings.retention.exportMaskingEnabled
  };

  const governanceSection = {
    id: "section-governance",
    kind: "governance" as const,
    title: "治理状态",
    summary: buildRetentionSummary(scenario.settings)
  };

  const existingGovernanceSectionIndex = scenario.report.sections.findIndex(
    (section) => section.kind === "governance"
  );

  if (existingGovernanceSectionIndex === -1) {
    scenario.report.sections = [...scenario.report.sections, governanceSection];
  } else {
    scenario.report.sections[existingGovernanceSectionIndex] = governanceSection;
  }

  scenario.viewState = buildViewState(scenario, activeRecords.length);

  return {
    activeRecords,
    filteredCount
  };
};

export const synchronizeScenario = (scenario: FixtureScenario): void => {
  const archivedCount = applyRetentionWindow(scenario);
  recalculateScenario(scenario, archivedCount);
};

interface GovernanceServiceDependencies {
  resolveScenario: (scenarioId: string) => FixtureScenario;
}

export const createGovernanceService = ({
  resolveScenario
}: GovernanceServiceDependencies) => ({
  async getSettingsCenter(
    request: GovernanceScenarioRequest
  ): Promise<GovernanceSettingsCenter> {
    const scenario = resolveScenario(request.scenarioId);

    synchronizeScenario(scenario);

    return buildSettingsCenter(scenario);
  },

  async setRecordingEnabled(
    request: GovernanceRecordingSwitchRequest
  ): Promise<
    OperationEnvelope<GovernanceRecordingSwitchRequest, { recordingEnabled: boolean }>
  > {
    const scenario = resolveScenario(request.scenarioId);

    scenario.settings.recordingEnabled = request.enabled;

    if (!request.enabled) {
      scenario.settings.pauseReason = request.reason ?? "recording-disabled";
    }

    synchronizeScenario(scenario);

    const envelope = createEnvelope(
      "refresh-analysis",
      request,
      true,
      { recordingEnabled: request.enabled },
      []
    );

    scenario.lastOperation = envelope as unknown as OperationEnvelope<Record<string, unknown>, Record<string, unknown>>;

    return envelope;
  },

  async updateStopWords(
    request: GovernanceStopWordsRequest
  ): Promise<OperationEnvelope<GovernanceStopWordsRequest, { stopWordsCount: number }>> {
    const scenario = resolveScenario(request.scenarioId);

    const stopWords = Array.from(
      new Set(request.stopWords.map((item) => item.trim()).filter((item) => item.length > 0))
    );

    scenario.settings.stopWords = stopWords;

    synchronizeScenario(scenario);

    const envelope = createEnvelope(
      "refresh-analysis",
      request,
      true,
      {
        stopWordsCount: stopWords.length
      },
      []
    );

    scenario.lastOperation = envelope as unknown as OperationEnvelope<Record<string, unknown>, Record<string, unknown>>;

    return envelope;
  },

  async pauseRecording(
    request: GovernancePauseRequest
  ): Promise<OperationEnvelope<GovernancePauseRequest, { paused: boolean }>> {
    const scenario = resolveScenario(request.scenarioId);

    scenario.settings.paused = true;
    scenario.settings.pauseReason = request.reason;
    synchronizeScenario(scenario);

    const envelope = createEnvelope(
      "refresh-analysis",
      request,
      true,
      { paused: true },
      []
    );

    scenario.lastOperation = envelope as unknown as OperationEnvelope<Record<string, unknown>, Record<string, unknown>>;

    return envelope;
  },

  async resumeRecording(
    request: GovernanceScenarioRequest
  ): Promise<OperationEnvelope<GovernanceScenarioRequest, { paused: boolean }>> {
    const scenario = resolveScenario(request.scenarioId);

    scenario.settings.paused = false;
    scenario.settings.pauseReason = undefined;
    synchronizeScenario(scenario);

    const envelope = createEnvelope(
      "refresh-analysis",
      request,
      true,
      { paused: false },
      []
    );

    scenario.lastOperation = envelope as unknown as OperationEnvelope<Record<string, unknown>, Record<string, unknown>>;

    return envelope;
  },

  async upsertFilterRule(
    request: GovernanceRuleUpsertRequest
  ): Promise<OperationEnvelope<GovernanceRuleUpsertRequest, { ruleCount: number }>> {
    const scenario = resolveScenario(request.scenarioId);
    const byId = new Map(scenario.settings.filterRules.map((rule) => [rule.id, rule]));

    byId.set(request.rule.id, request.rule);
    scenario.settings.filterRules = Array.from(byId.values());

    synchronizeScenario(scenario);

    const envelope = createEnvelope(
      "refresh-analysis",
      request,
      true,
      {
        ruleCount: scenario.settings.filterRules.length
      },
      []
    );

    scenario.lastOperation = envelope as unknown as OperationEnvelope<Record<string, unknown>, Record<string, unknown>>;

    return envelope;
  },

  async deleteRecords(
    request: GovernanceDeleteRequest
  ): Promise<OperationEnvelope<GovernanceDeleteRequest, { deletedRecords: number }>> {
    const scenario = resolveScenario(request.scenarioId);
    const errors: OperationError[] = [];

    if (!request.confirmed) {
      errors.push(
        createError("CONFIRMATION_REQUIRED", "删除操作需要用户确认。")
      );
    }

    if (request.scope === "all" && !request.secondConfirmed) {
      errors.push(
        createError("CONFIRMATION_REQUIRED", "全量删除需要二次确认。")
      );
    }

    if (request.scope === "day" && !request.dateKey) {
      errors.push(createError("INVALID_RANGE", "按天删除必须提供 dateKey。"));
    }

    const start = request.startAt ? parseTime(request.startAt) : null;
    const end = request.endAt ? parseTime(request.endAt) : null;

    if (
      request.scope === "range" &&
      (!request.startAt || !request.endAt)
    ) {
      errors.push(createError("INVALID_RANGE", "按范围删除必须提供 startAt 和 endAt。"));
    }

    if (
      request.scope === "range" &&
      request.startAt &&
      request.endAt &&
      (start === null || end === null)
    ) {
      errors.push(createError("INVALID_RANGE", "按范围删除的时间格式无效。"));
    }

    if (request.scope === "range" && start !== null && end !== null && start > end) {
      errors.push(createError("INVALID_RANGE", "按范围删除时 startAt 不能晚于 endAt。"));
    }

    if (errors.length > 0) {
      const envelope = createEnvelope<GovernanceDeleteRequest, { deletedRecords: number }>(
        "delete-records",
        request,
        false,
        { deletedRecords: 0 },
        errors
      );

      scenario.lastOperation = envelope as unknown as OperationEnvelope<Record<string, unknown>, Record<string, unknown>>;

      return envelope;
    }

    let deletedRecords = 0;

    scenario.records.forEach((record) => {
      if (record.isDeleted) {
        return;
      }

      let shouldDelete = false;

      if (request.scope === "all") {
        shouldDelete = true;
      }

      if (request.scope === "day" && request.dateKey) {
        shouldDelete = record.dateKey === request.dateKey;
      }

      if (request.scope === "range" && start !== null && end !== null) {
        const occurredAt = parseTime(record.occurredAt);

        if (occurredAt !== null && occurredAt >= start && occurredAt <= end) {
          shouldDelete = true;
        }
      }

      if (shouldDelete) {
        record.isDeleted = true;
        deletedRecords += 1;
      }
    });

    synchronizeScenario(scenario);

    const envelope = createEnvelope(
      "delete-records",
      request,
      true,
      { deletedRecords },
      []
    );

    scenario.lastOperation = envelope as unknown as OperationEnvelope<Record<string, unknown>, Record<string, unknown>>;

    return envelope;
  },

  async retainRecords(
    request: GovernanceRetainRequest
  ): Promise<
    OperationEnvelope<
      GovernanceRetainRequest,
      { retentionMode: PrivacyMode; archivedRecords: number }
    >
  > {
    const scenario = resolveScenario(request.scenarioId);

    if (!request.confirmed) {
      const envelope = createEnvelope(
        "retain-records",
        request,
        false,
        {
          retentionMode: scenario.settings.retention.mode,
          archivedRecords: 0
        },
        [createError("CONFIRMATION_REQUIRED", "保留策略变更需要确认。")]
      );

      scenario.lastOperation = envelope as unknown as OperationEnvelope<Record<string, unknown>, Record<string, unknown>>;

      return envelope;
    }

    if (
      request.retentionDays !== null &&
      (!Number.isInteger(request.retentionDays) || request.retentionDays < 0)
    ) {
      const envelope = createEnvelope(
        "retain-records",
        request,
        false,
        {
          retentionMode: scenario.settings.retention.mode,
          archivedRecords: 0
        },
        [createError("INVALID_RANGE", "retentionDays 必须是大于等于 0 的整数，或 null。")]
      );

      scenario.lastOperation = envelope as unknown as OperationEnvelope<Record<string, unknown>, Record<string, unknown>>;

      return envelope;
    }

    scenario.settings.retention = {
      mode: request.mode,
      retentionDays: request.retentionDays,
      autoArchive: request.autoArchive,
      exportMaskingEnabled: request.exportMaskingEnabled
    };

    const archivedRecords = applyRetentionWindow(scenario);
    recalculateScenario(scenario, archivedRecords);

    const envelope = createEnvelope(
      "retain-records",
      request,
      true,
      {
        retentionMode: request.mode,
        archivedRecords
      },
      []
    );

    scenario.lastOperation = envelope as unknown as OperationEnvelope<Record<string, unknown>, Record<string, unknown>>;

    return envelope;
  },

  async exportRecords(
    request: GovernanceExportRequest
  ): Promise<OperationEnvelope<GovernanceExportRequest, GovernanceExportOutput>> {
    const scenario = resolveScenario(request.scenarioId);

    synchronizeScenario(scenario);

    const shouldMask =
      request.maskContent ?? scenario.settings.retention.exportMaskingEnabled;
    const effectiveMask =
      shouldMask || scenario.settings.retention.mode !== "store-raw";
    const available = scenario.records.filter(
      (record) => !record.isDeleted && !record.isFiltered
    );

    const sample = available.slice(0, 5).map((record) => {
      if (scenario.settings.retention.mode === "stats-only") {
        return "[stats-only]";
      }

      if (effectiveMask) {
        return "[MASKED]";
      }

      return record.normalizedText;
    });

    const output: GovernanceExportOutput = {
      format: request.format,
      masked: effectiveMask,
      exportedRecords: available.length,
      sample
    };

    const envelope = createEnvelope("export-records", request, true, output, []);

    scenario.lastOperation = envelope as unknown as OperationEnvelope<Record<string, unknown>, Record<string, unknown>>;

    return envelope;
  }
});
