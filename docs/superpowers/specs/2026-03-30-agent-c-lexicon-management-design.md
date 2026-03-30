# Agent C 词库管理与迁移设计说明

## 1. 目标

在现有 Agent 0 共享契约与样例骨架上，交付一个可独立运行的词库资产管理层，使系统具备以下能力：

1. 词库总览（规模、新增、高频、低频陈旧、短语、收藏、忽略等指标）
2. 词条列表浏览（分类筛选、搜索、排序）
3. 词条管理操作（收藏、删除、忽略分析、标记短语、分类）
4. 词条导出（结构化文本、通用词表、Rime 可用格式）
5. 迁移助手（面向用户的导出与导入步骤说明）
6. 识别能力（低频陈旧词、高频新增词）

## 2. 边界与非目标

### 2.1 边界

- 仅处理 `LexiconEntry` 与 `VocabularyInsight` 相关资产，不触碰采集链路。
- 默认在本地样例数据上运行，返回可被页面层直接消费的数据。
- 所有操作都提供明确输入与输出，保证后续 Agent D/E/F 可稳定集成与测试。

### 2.2 非目标

- 不实现真实数据库持久化。
- 不实现复杂主题画像或统计引擎算法。
- 不实现完整 UI，仅交付服务接口、契约与演示输出。

## 3. 架构方案

采用“契约扩展 + 服务分层 + 样例驱动”的最小可用架构：

1. `packages/contracts`：新增词库管理查询、操作、导出、迁移助手相关类型。
2. `packages/mock-data`：增强场景词库样例，覆盖高频、新增、低频陈旧、短语、忽略。
3. `packages/services`：新增 `lexicon` 服务命名空间，实现查询、识别、操作、导出、迁移助手。
4. `apps/demo`：新增词库管理调用示例，验证核心路径可运行。
5. `tests`：新增 Agent C 测试文件，覆盖筛选、排序、操作、导出与识别逻辑。

## 4. 核心数据设计

### 4.1 新增契约类型

- `LexiconOverview`: 词库总览指标
  - `totalEntries`, `newEntries`, `highFrequencyEntries`, `lowFrequencyStaleEntries`
  - `phraseEntries`, `favoriteEntries`, `ignoredEntries`, `deletedEntries`
- `LexiconFilterCategory`: `all/high-frequency/new/low-frequency-stale/phrase/favorite/ignored/deleted/domain/general/noise`
- `LexiconSortBy`: `usage-count/first-seen/last-seen/term`
- `LexiconSortOrder`: `asc/desc`
- `LexiconQuery`: 分类筛选 + 搜索 + 排序 + 分页（可选）
- `LexiconMutationAction`: `favorite/unfavorite/delete/restore/ignore/unignore/mark-phrase/set-category`
- `LexiconMutationRequest` / `LexiconMutationResult`
- `LexiconExportFormat`: `json/tsv/rime`
- `LexiconExportRequest` / `LexiconExportResult`
- `MigrationGuide`: 迁移助手步骤与注意事项

### 4.2 识别口径（显式）

- 低频陈旧词：`usageCount <= 2` 且 `lastSeenAt` 距离参考时间超过 30 天。
- 高频新增词：`usageCount >= 5` 且 `firstSeenAt` 距离参考时间不超过 7 天。

参考时间取：
- 优先 `query.referenceAt`
- 否则取场景中最大 `lastSeenAt`

## 5. 服务接口设计

`createServiceRegistry()` 新增 `lexicon` 命名空间：

1. `getOverview({ scenarioId }) => LexiconOverview`
2. `listEntries({ scenarioId, query }) => { entries, total }`
3. `identifyLowFrequencyStale({ scenarioId, referenceAt? }) => LexiconEntry[]`
4. `identifyHighFrequencyNew({ scenarioId, referenceAt? }) => LexiconEntry[]`
5. `mutateEntries({ scenarioId, request }) => LexiconMutationResult`
6. `exportEntries({ scenarioId, request }) => LexiconExportResult`
7. `getMigrationGuide({ scenarioId, format }) => MigrationGuide`

实现说明：
- 基于场景 `lexicon` 数据做纯函数处理，避免全局污染。
- `mutateEntries` 返回“变更后快照 + 变更清单”。
- `exportEntries` 输出文本内容与统计元数据，便于 demo 与后续文件落盘。

## 6. 导出格式约定

### 6.1 JSON

- 输出完整结构化数组，保留 `id/term/category/status/usageCount/firstSeenAt/lastSeenAt/source/notes`。

### 6.2 TSV（通用词表）

- 列：`term\tusageCount\tcategory\tstatus`
- 首行带表头，编码 UTF-8。

### 6.3 Rime

- 基础格式：`term\tweight`
- `weight` 取 `usageCount`（最小 1）。
- 包含注释头，说明来源场景与生成时间，便于直接作为 Rime 词库基础内容。

## 7. 错误态与空态策略

- 场景不存在：回退到 `normal-day`（与现有服务策略一致）。
- 过滤后无结果：返回 `entries: []` 与 `total: 0`，不抛异常。
- 变更目标不存在：在 `LexiconMutationResult.warnings` 给出提示。
- 导出集为空：仍返回合法文本（含表头或注释头），并标记 `exportedCount: 0`。

## 8. 测试策略

新增 `tests/agentc.lexicon.test.ts`，覆盖：

1. 总览指标是否完整、可解释。
2. 列表筛选（高频、新增、低频陈旧、短语、收藏、忽略）是否正确。
3. 搜索与排序是否稳定。
4. `mutateEntries` 对状态与分类修改是否符合预期。
5. `exportEntries` 三种格式输出是否符合约定。
6. 低频陈旧与高频新增识别是否符合口径。
7. 空数据场景与过滤场景不崩溃。

## 9. 验收映射（对应 Agent C Prompt）

- 词库总览指标：由 `getOverview` 覆盖。
- 列表视图 / 分类筛选 / 搜索 / 排序：由 `listEntries` 覆盖。
- 收藏 / 删除 / 忽略 / 标记短语 / 分类：由 `mutateEntries` 覆盖。
- 导出选中词条 / 按分类导出：由 `exportEntries` 覆盖。
- 迁移助手文案与流程：由 `getMigrationGuide` 覆盖。
- 低频陈旧词识别 / 高频新增词识别：由识别接口覆盖。

## 10. 交付文件计划

- 修改：`packages/contracts/src/index.ts`
- 修改：`packages/mock-data/src/index.ts`
- 修改：`packages/services/src/index.ts`
- 修改：`apps/demo/src/index.ts`
- 新增：`tests/agentc.lexicon.test.ts`

以上设计与 Agent C 要求一一对应，并保持对 Agent 0 基线最小侵入。