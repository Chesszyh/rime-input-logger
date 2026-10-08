# Developer Guide

本文档面向开发者、维护者和发布者，介绍本项目的结构、模块职责、开发命令、测试方法与发布流程。

## 1. 项目概览

本项目当前是一个 TypeScript monorepo，围绕“输入事件 -> 分析 -> 页面数据 -> 报告/治理/词库导出”这条主线组织。

顶层结构如下：

- `apps/`
  - `demo/`：CLI 演示入口
  - `rime-journal/`：真实 Rime JSONL 日志的词云/事件 CLI
  - `web-dashboard/`：本地浏览器 Dashboard
- `packages/`
  - `contracts/`：共享类型与页面数据契约
  - `mock-data/`：样例场景
  - `services/`：面向页面和 demo 的聚合服务层
  - `analytics/`：统计、词汇、时段等分析引擎
  - `dashboard/`：Dashboard 与报告装配逻辑
  - `rime-journal/`：Rime commit JSONL 读取、校验、转换和词云报告
- `tests/`
  - 各 Agent 交付的测试文件与 fixture
- `docs/`
  - 设计、契约、测试、发布和 QA 文档

## 2. 模块职责

### `packages/contracts`

定义统一数据结构，避免不同模块各自发明接口。

常见对象包括：

- `InputRecordEvent`
- `InputSession`
- `StatsSnapshot`
- `VocabularyInsight`
- `LexiconEntry`
- `AnalyticsReport`
- `OperationEnvelope`
- `ViewState`

如果你修改了页面数据形状或导出结构，通常要先改这里。

### `packages/mock-data`

提供开发和测试使用的样例场景，目前主场景包括：

- `normal-day`
- `empty-history`
- `power-user-day`
- `filtered-day`

如果你要新增新场景或改动现有输出基线，这里通常需要同步更新。

### `packages/analytics`

提供分析逻辑，例如：

- 时间范围过滤
- 统计汇总
- 时段与会话分析
- 词汇分析

Agent B 的核心交付主要在这里。

### `packages/services`

这是业务聚合层，负责把底层样例数据和分析结果拼接成页面/报告可直接消费的稳定接口。

外部调用通常从这里进入，例如：

- `dashboard.getDashboardBootstrap()`
- `lexicon.getOverview()`
- `lexicon.listEntries()`
- `lexicon.exportEntries()`
- `governance.exportRecords()`

### `packages/dashboard`

负责把统计、词汇、时段、治理和报告内容组织成可展示的结构。

### `packages/rime-journal`

负责真实 Rime commit 日志的本地读取和分析。主要边界：

- 默认读取 `~/.local/share/personal-input-analytics/raw/*.jsonl`
- 将 `RimeCommitJournalEntry` 转换为现有 `RawInputRecord`
- 复用 `services/ingestion` 和 `analytics/vocabulary-analysis`
- 提供 Markdown 与 JSON 两类输出格式

Rime 侧写入逻辑不在 TypeScript 包里，而在仓库的 `rime/lua/commit_logger.lua`，部署方式见 [Rime 上屏日志](./rime-journal.md)。
Rime Lua 组件依赖 `librime-lua`。如果启动日志出现 `error creating processor: 'lua_processor'` 或 `error creating filter: 'lua_filter'`，优先检查该包是否安装以及 `/usr/lib64/rime-plugins/librime-lua.so` 是否存在。

### `apps/demo`

CLI 入口，负责解析命令参数并打印 JSON 结果。

支持的关键参数包括：

- `--scenario`
- `--preset`
- `--show-terms`
- `--unmasked`

### `apps/rime-journal`

真实输入日志 CLI，常用命令：

```bash
npm run rime:journal -- wordcloud --preset today
npm run rime:journal -- wordcloud --week 2026-W24
npm run rime:journal -- events --date 2026-06-08
```

## 3. 主要开发命令

在仓库根目录运行：

- 安装依赖：`npm install`
- 全量测试：`npm test`
- Agent F 回归与快照测试：`npm run test:agent-f`
- 构建：`npm run build`
- 浏览器开发：`npm run web`
- 浏览器打包：`npm run web:build`
- 主线 demo：`npm run demo`
- 空数据 demo：`npm run demo:empty`
- Rime 日志词云/事件：`npm run rime:journal -- wordcloud --preset today`
- 发布门禁：`npm run release:check`

## 4. 测试策略

### 快速验证

当你只是改了小范围逻辑，先跑：

```bash
npm run demo
npm run demo:empty
```

### 回归验证

涉及页面结构、导出、快照或服务集成时，至少跑：

```bash
npm run test:agent-f
npm run test:web
```

涉及 Rime 日志读取或词云 CLI 时，至少跑：

```bash
npm test -- tests/rimeJournal.test.ts
npm run rime:journal -- wordcloud --preset today
```

### 全量验证

在合并、发布或大改前，必须跑：

```bash
npm test
npm run build
npm run release:check
```

完整流程见 [testing/full-test-guide.md](./testing/full-test-guide.md)。

## 5. Fixture 与快照

关键基准文件位于：

- `tests/fixtures/agent-f/expected/dashboard-normal-day.json`
- `tests/fixtures/agent-f/expected/governance-export-summary.json`
- `tests/fixtures/agent-f/expected/lexicon-rime-export.txt`

只有在“产品预期确实变了”的情况下，才应该刷新这些文件。不要为了让测试变绿而盲目覆盖基准。

## 6. 代码修改时的同步更新规则

### 改数据结构时

同步检查并更新：

- `packages/contracts/src/index.ts`
- `docs/contracts/shared-contract.md`
- `docs/reference/field-dictionary.md`
- 相关测试和 fixture

### 改 demo 输出时

同步检查并更新：

- `apps/demo/src/index.ts`
- `apps/demo/src/config.ts`
- `docs/demo/demo-playbook.md`
- `docs/testing/full-test-guide.md`

### 改真实 Rime 日志链路时

同步检查并更新：

- `rime/lua/commit_logger.lua`
- `rime/schema.custom.yaml.example`
- `packages/rime-journal/src/index.ts`
- `apps/rime-journal/src/index.ts`
- `tests/rimeJournal.test.ts`
- `docs/user-guide.md`
- `docs/developer-guide.md`

### 改 Web Dashboard 时

同步检查并更新：

- `apps/web-dashboard/src/**`
- `docs/user-guide.md`
- `docs/developer-guide.md`
- `docs/testing/full-test-guide.md`
- `README.md`

### 改测试门禁时

同步检查并更新：

- `package.json`
- `docs/release/release-guide.md`
- `docs/release/final-preflight-checklist.md`
- `README.md`

## 7. 发布流程

推荐顺序如下：

1. 保证当前分支工作树干净
2. 运行 `npm run test:agent-f`
3. 运行 `npm test`
4. 运行 `npm run build`
5. 运行 `npm run web:build`
6. 运行 `npm run demo -- --scenario normal-day --preset last-7-days`
7. 运行 `npm run demo:empty`
8. 运行 `npm run release:check`
9. 对照 [release/final-preflight-checklist.md](./release/final-preflight-checklist.md) 做最终核对

## 8. 当前维护注意事项

### `.worktrees/` 已被显式排除

仓库根目录存在 `.worktrees/` 用于隔离开发。现在：

- `vitest.config.ts` 会排除 `.worktrees/**`
- `tsconfig.json` 会排除 `.worktrees/**`

这样可以避免测试和编译把隔离 worktree 里的重复文件也算进去。

### `docs/superpowers/**` 属于过程资产

这些文档记录的是设计与实施过程，不是用户手册。它们适合：

- 追溯历史设计意图
- 理解当时的任务拆分
- 辅助维护复杂模块

但不适合作为日常操作手册。

## 9. 推荐阅读路径

- 想理解整体架构：先看 [architecture/module-dependency-map.md](./architecture/module-dependency-map.md)
- 想理解共享模型：看 [contracts/shared-contract.md](./contracts/shared-contract.md)
- 想理解字段含义：看 [reference/field-dictionary.md](./reference/field-dictionary.md)
- 想理解真实 Rime 日志：看本文的 `packages/rime-journal` 章节和 [user-guide.md](./user-guide.md)
- 想理解发布与测试：看 [testing/full-test-guide.md](./testing/full-test-guide.md) 和 [release/release-guide.md](./release/release-guide.md)
- 想理解风险：看 [qa/risk-register.md](./qa/risk-register.md)

## 10. 新人接手建议

如果你是第一次维护这个仓库，建议按下面顺序上手：

1. `npm install`
2. `npm run demo`
3. `npm run demo:empty`
4. `npm run web`
5. `npm test`
6. 阅读 [docs/README.md](./README.md)
7. 阅读 [architecture/module-dependency-map.md](./architecture/module-dependency-map.md)
8. 阅读 [contracts/shared-contract.md](./contracts/shared-contract.md)
