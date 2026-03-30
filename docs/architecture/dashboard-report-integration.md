# Dashboard 与报告联调说明（Agent D）

## 目标

让页面层在没有真实输入法环境时，依赖 Agent 0 的样例场景完成开发；后续无缝切换到 Agent B 的真实分析输出。

## 假数据开发模式

### 1) 场景列表

通过服务桩读取可用场景：

- `empty-history`
- `normal-day`
- `power-user-day`
- `filtered-day`

代码入口：`packages/services/src/index.ts`

### 2) 拉取 Dashboard Bootstrap

```ts
const services = createServiceRegistry();
const bootstrap = await services.dashboard.getDashboardBootstrap({
  preset: "last-7-days",
  scenarioId: "normal-day"
});
```

### 3) 组装页面视图

```ts
const dashboard = buildDashboardExperience(bootstrap, {
  hideTermsInReport: false,
  forceMaskedContent: true
});
```

页面结构由 `packages/dashboard/src/index.ts` 输出：

- `overview`（总览页）
- `stats`（统计页）
- `vocabulary`（词汇页）
- `time`（时间页）
- `report`（报告页）

每页都包含：

- `state`（空态/无数据态/正常态）
- `rangeLabel`（时间范围）
- 可读的图表元信息（标题、单位、说明）

### 4) 报告导出

```ts
const exported = exportReportArtifact(dashboard.pages.report, {
  format: "text", // json | text | html
  hideTerms: true
});
```

导出能力：

- JSON：结构化数据
- Text：可读摘要
- HTML：可直接展示

## 与真实数据联调

当 Agent B 提供真实分析服务后，仅替换 `getDashboardBootstrap` 的数据来源，不改变 Agent D 页面组装和导出接口。

保持不变的输入契约：

- `DashboardBootstrap.overview`
- `DashboardBootstrap.vocabulary`
- `DashboardBootstrap.timeActivity`
- `DashboardBootstrap.report`

这能确保页面层对“假数据/真数据”无感知切换。

## 验收建议

1. `normal-day`：验证总览、统计、词汇、时间、报告主路径。
2. `empty-history`：验证五页空态文案可读。
3. `filtered-day`：验证隐藏词与脱敏导出行为。
4. `power-user-day`：验证高活跃场景下图表与报告模板稳定。
