# Agent B 设计文档：统计分析引擎

## 1. 背景与目标

在 Agent 0 已提供共享契约、样例数据和最小服务桩的前提下，Agent B 负责把输入事件与会话数据转换为可直接被 Dashboard 与报告消费的统计结果，覆盖 P0/P1 主线分析能力。

本设计目标：

1. 实现基础统计：字数、词数、条数、累计、活跃天数、连续活跃天数与趋势聚合（日/周/月）。
2. 实现词汇分析：高频词、高频短语、新词、热词上升/下降。
3. 实现时间分析：24 小时活跃分布与日期 × 时段热力图。
4. 实现会话分析：会话数量、平均时长、最长时长、深度会话数。
5. 生成可直接给页面和报告使用的摘要字段。

## 2. 范围与非目标

### 范围

- `packages/analytics` 新增并承载 Agent B 全部核心逻辑。
- `packages/services` 改为调用分析引擎实时生成结果，而非直接读取 fixture 中的预计算统计。
- 新增 Agent B 测试和文档交付（样例输入/输出对照、边界案例说明）。

### 非目标

- 不实现图表渲染。
- 不实现词库编辑交互。
- 不实现设置页的治理流程 UI。
- 不依赖真实输入法环境，仍以本地样例事件流为开发输入。

## 3. 模块设计

新增目录：`packages/analytics/src/`

- `index.ts`：分析服务主模块，负责组织各子模块并输出总结果。
- `range-filter.ts`：时间范围解析与过滤（today/yesterday/last-7-days/last-30-days/this-month/custom/all-time）。
- `stats-aggregation.ts`：基础统计、累计统计、日/周/月聚合、活跃天数与连续活跃。
- `vocabulary-analysis.ts`：词项提取、停用词/噪声过滤、高频词/短语、新词、热词升降计算。
- `time-activity-analysis.ts`：24 小时分布与热力图分桶。
- `session-analysis.ts`：会话摘要聚合。
- `summary-generator.ts`：高亮文案和报告摘要字段生成。

## 4. 数据流

1. 输入：`InputRecordEvent[]`、`InputSession[]`、`UserSettings`、查询范围。
2. 先由 `range-filter.ts` 计算当前窗口和上一等长窗口，并得到过滤后的记录/会话。
3. 分别调用：
   - 统计聚合模块
   - 词汇分析模块
   - 时间分布模块
   - 会话统计模块
4. 由摘要模块生成：
   - `StatsSnapshot.highlights`
   - 报告标题与摘要片段
5. 服务层组装为 `DashboardBootstrap` 下的页面对象，保证前端可直接消费。

## 5. 关键口径

### 5.1 记录过滤口径

- 统计默认仅纳入：`!isFiltered && !isDeleted && normalizedText 非空` 的事件。
- 词汇分析在此基础上再过滤：
  - `stopWords`
  - 纯噪声短词（长度 < 2）
  - 纯符号片段

### 5.2 趋势与比较口径

- 当前窗口：由查询范围决定。
- 上一窗口：与当前窗口等长，紧邻当前窗口之前。
- 热词升降：`delta = currentCount - previousCount`。
  - `delta > 0` 为 rising
  - `delta < 0` 为 falling

### 5.3 活跃与会话口径

- 活跃天：当前窗口内 `chars > 0` 的日期数。
- 连续活跃：从当前窗口末日向前连续有输入的天数。
- 深度会话：`intensity === "deep-focus"`。

## 6. 服务层接线改造

`packages/services/src/index.ts` 改造点：

1. 解析查询范围并过滤场景记录。
2. 调用 `packages/analytics` 生成 stats/vocabulary/time/session/summary。
3. 保留 `DashboardBootstrap` 输出契约不变。
4. 空数据或过滤后无结果时返回统一 `ViewState`（`NO_DATA` 或 `EMPTY_RESULT`）。

## 7. 测试设计

新增测试文件：`tests/agentB.analysis.test.ts`

覆盖场景：

1. 时间范围过滤（today/last-7-days/last-30-days/all-time/custom）。
2. 日/周/月聚合与累计统计口径。
3. 连续活跃天数计算。
4. 高频词/短语/新词/升降词输出稳定性。
5. 停用词、噪声词、过滤事件不污染词汇结果。
6. 24 小时分布长度为 24，热力图按日期 × 时段输出。
7. 会话摘要（数量、平均、最长、深度会话数）。
8. 空数据与过滤后无结果的稳定性。

## 8. 文档交付

- `docs/architecture/agent-b-edge-cases.md`
  - 说明空数据、跨日、过滤后为空、停用词污染、异常短文本等边界处理。
- `docs/contracts/agent-b-sample-io.md`
  - 提供样例输入事件与对应统计输出字段对照，便于 Agent D/F/G 联调与验收。

## 9. 验证与验收

执行：

- `npm test`
- `npm run build`
- `npm run demo`

验收判断：

1. 给定样例数据可稳定输出统计、词汇、时间与会话结果。
2. 不同时间范围下统计口径自洽。
3. 输出字段可直接支撑总览页、统计页、词汇页、时间页和报告页消费。