# Module Dependency Map

## Dependency Graph

1. `packages/contracts`
2. `packages/mock-data` depends on `packages/contracts`
3. `packages/services` depends on `packages/contracts` and `packages/mock-data`
4. `apps/demo` depends on `packages/services`

## Agent Hand-off

1. Agent A 基于 `InputRecordEvent` 与 `InputSession` 输出真实采集和切分结果。
2. Agent B 将真实事件流映射到 `StatsSnapshot` 与 `VocabularyInsight`。
3. Agent D 先接 `DashboardBootstrap` 假数据，再切换到真实服务输出。
4. Agent C 基于 `LexiconEntry` 与词汇洞察扩展词库管理。
5. Agent E 在不改变页面契约的前提下扩展 `UserSettings` 与 `OperationEnvelope`。
6. Agent F 复用 `fixtureScenarios` 做回归样例。
7. Agent G 用 `apps/demo` 验证端到端接线与演示流程。

## Integration Order

- 先联调 `contracts -> mock-data -> services`
- 再联调 `A -> B`
- 然后 `D` 接真实数据
- 最后并入 `C/E/F/G`

## Isolation Notes

- 统计算法、采集实现、前端图表都不应反向依赖 `apps/demo`。
- `packages/contracts` 禁止引用任何运行时依赖，保证它是并行开发的最低公共层。
