# Documentation Guide

本文档是 `./docs` 目录的总导航，帮助你快速判断“先看什么”“遇到问题看什么”“每份文档是做什么的”。

## 建议阅读顺序

如果你是第一次接触本项目，建议按下面顺序阅读：

1. [用户指南](./user-guide.md)
2. [常见问题](./faq.md)
3. [演示操作手册](./demo/demo-playbook.md)
4. [完整测试指南](./testing/full-test-guide.md)
5. [开发者指南](./developer-guide.md)

如果你是维护者或准备发布版本，建议直接阅读：

1. [开发者指南](./developer-guide.md)
2. [发布指南](./release/release-guide.md)
3. [最终发布前检查清单](./release/final-preflight-checklist.md)
4. [QA 验收清单](./qa/acceptance-checklist.md)

## 核心入口文档

- [user-guide.md](./user-guide.md)
  作用：面向最终使用者，介绍项目用途、安装方式、运行 demo、理解输出结果、常见操作路径。
- [developer-guide.md](./developer-guide.md)
  作用：面向开发者和维护者，介绍目录结构、模块职责、开发命令、测试策略、发布流程。
- [faq.md](./faq.md)
  作用：汇总最常见的问题和故障排查建议，适合快速查阅。

## 目录结构与各文档作用

### `architecture/`

- [architecture/acceptance-baseline.md](./architecture/acceptance-baseline.md)
  作用：定义项目集成后的验收基线，说明哪些能力应当可用、哪些输出应保持稳定。
- [architecture/agent-a-boundary-notes.md](./architecture/agent-a-boundary-notes.md)
  作用：记录 Agent A 负责的输入采集与边界约束，适合阅读数据采集能力时参考。
- [architecture/agent-b-edge-cases.md](./architecture/agent-b-edge-cases.md)
  作用：记录分析引擎的重要边界条件和特殊情况，适合维护统计/词汇逻辑时参考。
- [architecture/dashboard-report-integration.md](./architecture/dashboard-report-integration.md)
  作用：说明 Dashboard、报告和服务层之间如何拼装数据，适合集成界面或导出能力时阅读。
- [architecture/module-dependency-map.md](./architecture/module-dependency-map.md)
  作用：展示包之间的依赖关系，是理解整体代码结构的最佳入口之一。

### `contracts/`

- [contracts/shared-contract.md](./contracts/shared-contract.md)
  作用：定义全项目共享数据契约，是理解输入事件、会话、报告、词库条目等核心模型的基础文档。
- [contracts/agent-b-sample-io.md](./contracts/agent-b-sample-io.md)
  作用：给出 Agent B 分析链路的样例输入/输出，用于验证统计与词汇分析是否符合预期。

### `demo/`

- [demo/demo-playbook.md](./demo/demo-playbook.md)
  作用：最短 demo 运行手册，适合第一次验证仓库是否能跑通。

### `integration/`

- [integration/agent-g-integration-log.md](./integration/agent-g-integration-log.md)
  作用：记录 Agent G 集成交付内容与收口过程，适合追踪最后一轮整合改动。

### `qa/`

- [qa/acceptance-checklist.md](./qa/acceptance-checklist.md)
  作用：QA/回归验收清单，重点关注 Agent F 引入的快照和导出基线。
  说明：其中有些步骤来自独立 worktree 的测试上下文，属于回归验证资料。
- [qa/risk-register.md](./qa/risk-register.md)
  作用：记录当前已知风险、回归敏感点和需要重点关注的薄弱环节。

### `reference/`

- [reference/field-dictionary.md](./reference/field-dictionary.md)
  作用：字段字典，逐项解释关键字段的含义、来源和用途。

### `release/`

- [release/release-guide.md](./release/release-guide.md)
  作用：发布流程概览，说明最小发布门禁、常见失败路径和构建范围。
- [release/final-preflight-checklist.md](./release/final-preflight-checklist.md)
  作用：发布前逐项核对清单，用来确认测试、构建、demo 和文档一致性。

### `testing/`

- [testing/full-test-guide.md](./testing/full-test-guide.md)
  作用：最完整的测试说明，覆盖安装、烟雾测试、回归测试、全量测试、构建验证和 fixture 对比。

### `superpowers/`

- [superpowers/specs/2026-03-30-agent-b-analysis-engine-design.md](./superpowers/specs/2026-03-30-agent-b-analysis-engine-design.md)
  作用：Agent B 分析引擎设计说明，属于历史设计文档。
- [superpowers/specs/2026-03-30-agent-c-lexicon-management-design.md](./superpowers/specs/2026-03-30-agent-c-lexicon-management-design.md)
  作用：Agent C 词库管理设计说明，属于历史设计文档。
- [superpowers/plans/2026-03-30-agent-b-analysis-engine.md](./superpowers/plans/2026-03-30-agent-b-analysis-engine.md)
  作用：Agent B 的实现计划，适合回溯当时如何分解任务。
- [superpowers/plans/2026-03-30-agent-c-lexicon-management.md](./superpowers/plans/2026-03-30-agent-c-lexicon-management.md)
  作用：Agent C 的实现计划，适合维护词库模块时参考。
- [superpowers/plans/2026-03-30-agent-f-test-suite.md](./superpowers/plans/2026-03-30-agent-f-test-suite.md)
  作用：Agent F 测试套件规划文档，适合理解回归测试设计意图。

### 根目录补充文档

- [keylogger.md](./keylogger.md)
  作用：记录 Linux/Fedora 上的键盘事件采集背景调研和工具选型建议。
  说明：这是背景研究材料，不是本项目主线运行文档。

## 按场景查文档

如果你想：

- 快速跑起来：看 [user-guide.md](./user-guide.md) 和 [demo/demo-playbook.md](./demo/demo-playbook.md)
- 全面测试：看 [testing/full-test-guide.md](./testing/full-test-guide.md)
- 发布版本：看 [release/release-guide.md](./release/release-guide.md) 和 [release/final-preflight-checklist.md](./release/final-preflight-checklist.md)
- 理解数据模型：看 [contracts/shared-contract.md](./contracts/shared-contract.md) 和 [reference/field-dictionary.md](./reference/field-dictionary.md)
- 理解代码结构：看 [developer-guide.md](./developer-guide.md) 和 [architecture/module-dependency-map.md](./architecture/module-dependency-map.md)
- 排查风险：看 [qa/risk-register.md](./qa/risk-register.md) 和 [faq.md](./faq.md)

## 文档维护建议

- 面向最终使用者的说明，优先更新 [user-guide.md](./user-guide.md)。
- 面向开发者和发布者的流程，优先更新 [developer-guide.md](./developer-guide.md)、[testing/full-test-guide.md](./testing/full-test-guide.md)、[release/release-guide.md](./release/release-guide.md)。
- 如果修改了数据结构或服务接口，务必同步更新 [contracts/shared-contract.md](./contracts/shared-contract.md) 和 [reference/field-dictionary.md](./reference/field-dictionary.md)。
