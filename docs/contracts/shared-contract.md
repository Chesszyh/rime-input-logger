# Shared Contract Baseline

## Goal

Agent 0 提供一套对 P0/P1 主线稳定、对实现细节保持松耦合的共享契约。后续 Agent 只依赖类型、样例和接口语义，不依赖某个输入法运行环境。

## Package Layout

- `packages/contracts`: 全局共享类型、页面数据模型、操作信封与统一状态码。
- `packages/mock-data`: 独立开发用样例场景，覆盖空数据、普通日、高活跃日、含过滤词。
- `packages/services`: 最小服务桩，向页面层暴露稳定读取接口。
- `apps/demo`: 可运行演示入口，验证骨架与样例能联通。

## Core Entities

- `InputRecordEvent`: 已上屏输入事件的统一最小明细，保留过滤、脱敏、候选位次和时间归档字段。
- `InputSession`: 由事件聚合出的会话对象，统一会话时长、跨日、强度口径。
- `StatsSnapshot`: 面向统计页和总览页的聚合结果，直接包含卡片、趋势、小时分布和热力图。
- `VocabularyInsight`: 高频词、新词、热词变化等词汇洞察对象。
- `LexiconEntry`: 词库资产条目，用于管理、迁移和导出。
- `AnalyticsReport`: 报告对象，按 section 组织总览、词汇、时段和治理摘要。
- `UserSettings`: 记录开关、暂停、保留策略、过滤规则和停用词设置。
- `OperationEnvelope`: 删除、保留、导出、脱敏等治理操作的统一输入输出格式。
- `ViewState`: 页面统一状态表达，覆盖 `READY`、`NO_DATA`、`EMPTY_RESULT`、`PERMISSION_DENIED`、`PAUSED`、`ERROR`。

## Page Mapping

- 总览页依赖 `OverviewPageData`。
- 词汇页依赖 `VocabularyPageData`。
- 时间页依赖 `TimeActivityPageData`。
- 设置与治理页依赖 `GovernancePageData`。
- 首页和报告入口可直接依赖 `DashboardBootstrap`。

## Stub Interfaces

- `meta.listFixtureScenarios()`: 返回可用于开发或验收的样例场景 ID。
- `dashboard.getDashboardBootstrap(query)`: 返回页面层可直接消费的总览、词汇、时间、治理与报告数据。
- `lexicon.getOverview({ scenarioId })`: 返回词库总览指标（规模、新增、高频、低频陈旧等）。
- `lexicon.listEntries({ scenarioId, query })`: 返回支持分类筛选、搜索与排序的词条列表。
- `lexicon.mutateEntries({ scenarioId, request })`: 提供收藏/删除/忽略/标记短语/分类等操作。
- `lexicon.exportEntries({ scenarioId, request })`: 提供 `json/tsv/rime` 三种最小可用导出形式。
- `lexicon.identifyLowFrequencyStale({ scenarioId, referenceAt? })`: 识别低频且长期未使用词条。
- `lexicon.identifyHighFrequencyNew({ scenarioId, referenceAt? })`: 识别高频新增词条。
- `lexicon.getMigrationGuide({ scenarioId, format })`: 返回迁移助手步骤与注意事项文案。

## Boundary Rules

- 默认处理已上屏文本，不暴露原始按键流。
- 所有页面数据都必须携带 `range` 与 `viewState`。
- 所有治理操作都必须返回 `OperationEnvelope`，避免 UI 层自行拼凑成功/失败口径。
- 样例数据必须允许页面在没有真实 Rime/Fcitx 环境时独立开发。
