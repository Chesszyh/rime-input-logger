# Acceptance Baseline

## Agent 0 Deliverables

- 项目目录骨架可被 Node/TypeScript 工具链识别。
- 共享契约覆盖输入事件、会话、统计、词汇、词库、报告、设置、治理操作和页面状态。
- 样例数据至少覆盖空数据、普通日、高活跃日、含过滤词四类场景。
- 最小服务桩可为页面提供可直接消费的 bootstrap 数据。
- 文档明确字段字典、模块依赖和联调顺序。

## Scenario Coverage

- `empty-history`: 首次使用或记录为空。
- `normal-day`: 普通输入日，含两个会话与基础词汇信号。
- `power-user-day`: 高强度输入日，验证峰值和长会话。
- `filtered-day`: 含敏感应用或过滤规则命中，验证治理一致性。

## Out Of Scope

- 不实现真实输入采集。
- 不实现复杂统计或新词算法。
- 不实现正式 UI。

## Verification Commands

- `npm test`
- `npm run demo`
- `npm run build`
