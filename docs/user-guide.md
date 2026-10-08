# User Guide

本文档面向最终使用者，介绍如何安装、运行、理解本项目的输出，以及如何用最短路径验证它是否工作正常。

## 1. 这是什么

Personal Input Analytics System 是一个面向 Rime/Fcitx5 输入场景的本地优先分析系统。当前仓库提供的是一套可运行的演示与分析骨架，重点包括：

- 输入事件与会话建模
- 统计与词汇分析
- 词库管理与导出
- 治理与保留策略
- Dashboard 与报告输出
- 可直接运行的 demo CLI
- 可直接在浏览器中查看的 Web Dashboard

当前版本主要通过内置样例场景演示完整流程，方便在没有真实输入法采集环境的情况下验证产品主线。
同时，当前仓库已经提供 Fedora/Fcitx5/Rime 环境下的本地采集链路：Rime Lua 只记录最终上屏文本，并按天保存为 JSONL。

## 2. 你能用它做什么

你可以用这个项目：

- 捕获 Rime/rime-ice 最终提交到应用的文本
- 按天保存原始输入日志，供人类阅读、脚本处理或交给 LLM 分析
- 查看一段时间内的输入量、活跃天数、连续活跃天数等指标
- 查看高频词、新词、热词变化和短语词
- 查看活跃时段、热力图和会话统计
- 查看词库总览和导出预览
- 生成已脱敏的日报类报告预览
- 验证不同场景下系统如何表现，例如空数据、普通用户、高活跃用户、过滤后为空等

## 3. 环境要求

- Node.js 版本满足 `package.json` 的 `engines`
- `npm`
- 支持 TypeScript ESM 的本地开发环境

如果只是体验 demo，不需要安装 Rime/Fcitx5，也不需要真实输入数据。
如果要采集真实 Rime 输入，需要 Fcitx5 Rime 能加载当前配置目录下的 Lua 脚本。
Fedora 上需要安装 `librime-lua`，仅安装 `fcitx5-lua` 不够。

## 4. 安装

在仓库根目录运行：

```bash
npm install
```

安装完成后，你就可以直接运行 demo 和测试命令。

### 4.1 启动 Web Dashboard

```bash
npm run web
```

启动后，按终端输出打开本地地址，默认进入浏览器仪表盘。你可以在页面顶部直接切换：

- `scenario`
- `preset`
- `lexicon category`
- `hide terms in report`
- `force masked content`

如果你只想验证前端能否正常打包，运行：

```bash
npm run web:build
```

### 4.2 启用真实 Rime 输入采集

按照 [Rime 上屏日志](./rime-journal.md) 安装仓库内的采集器与 schema 补丁，验证日志后再运行查询命令。该指南统一说明路径配置、时间范围、停用方法和排查步骤。

## 5. 最短上手路径

### 5.1 运行主线 demo

```bash
npm run demo
```

默认等价于：

```bash
npm run demo -- --scenario normal-day --preset last-7-days
```

它会输出一段 JSON，其中包含：

- `demoConfig`
- `scenarioId`
- `navigation`
- `overview`
- `stats`
- `vocabulary`
- `time`
- `lexicon`
- `report`

### 5.2 查看空数据场景

```bash
npm run demo:empty
```

这个命令会加载 `empty-history` 场景，适合验证“首次使用 / 暂无数据”的产品状态。

### 5.3 查看今天的 Rime 词云

```bash
npm run rime:journal -- wordcloud --preset today
```

### 5.4 查看某一天的原始上屏事件

```bash
npm run rime:journal -- events --date 2026-06-08
```

## 6. 常用场景

### 普通使用场景

```bash
npm run demo -- --scenario normal-day --preset last-7-days
```

适合查看完整主线路径，是最推荐的默认验证命令。

### 高活跃用户场景

```bash
npm run demo -- --scenario power-user-day --preset last-30-days
```

适合验证高输入量、更多词汇和更明显的时段分布。

### 过滤数据场景

```bash
npm run demo -- --scenario filtered-day --preset today
```

适合验证在大量输入被过滤后，页面如何进入空结果或弱结果状态。

### 空历史场景

```bash
npm run demo -- --scenario empty-history --preset today
```

适合验证无数据状态、首次引导和空页面提示。

### 每日词云

```bash
npm run rime:journal -- wordcloud --date 2026-06-08
```

### 每周词云

按 ISO 周统计，`2026-W24` 表示 2026 年第 24 周：

```bash
npm run rime:journal -- wordcloud --week 2026-W24
```

### 近 7 天词云

```bash
npm run rime:journal -- wordcloud --preset last-7-days
```

### JSON 输出

如果后续要交给其他程序或 LLM 流水线处理：

```bash
npm run rime:journal -- wordcloud --preset today --format json
```

## 7. 如何理解输出

### `navigation`

表示系统有哪些主页面入口，以及每个页面当前状态，例如：

- `READY`：有数据，页面正常可用
- `NO_DATA`：没有可分析输入
- `EMPTY_RESULT`：当前筛选条件下没有结果
- `PAUSED`：采集或处理被暂停
- `ERROR`：出现错误

### `overview`

这是总览部分，通常包含：

- 输入字数
- 输入条数
- 活跃天数
- 连续活跃
- 最近输入时间
- 摘要高亮信息

如果这是你第一次看输出，建议先看 `overview.metrics` 和 `overview.highlights`。

### `stats`

这是统计页数据，重点包括：

- 趋势图
- 会话卡片
- 平均会话时长
- 最长会话

如果你想知道“这段时间总体输入量怎么样”，优先看这里。

### `vocabulary`

这是词汇分析部分，重点包括：

- 高频词榜
- 新词与热词变化
- 词云数据
- 短语词
- 降温词

如果你想知道“最近都在输入什么主题”，优先看这里。

### `time`

这是时间活跃度分析，重点包括：

- 小时分布
- 热力图
- 会话强度

如果你想知道“自己什么时候输入最活跃”，优先看这里。

### `lexicon`

这是词库管理概览，重点包括：

- 词条总量
- 新增词
- 高频新词
- 低频陈旧词
- Rime 导出预览

如果你想做词库整理或迁移，可以重点查看这里。

### `report`

这是报告预览数据，重点包括：

- 报告标题
- 摘要
- 可导出格式
- 文本预览

默认情况下，报告内容是脱敏的。

## 8. 常用命令

- 安装依赖：`npm install`
- 运行主线 demo：`npm run demo`
- 运行空数据 demo：`npm run demo:empty`
- 查看 Rime 今日词云：`npm run rime:journal -- wordcloud --preset today`
- 查看 Rime 每周词云：`npm run rime:journal -- wordcloud --week 2026-W24`
- 查看某日上屏事件：`npm run rime:journal -- events --date 2026-06-08`
- 启动浏览器 Dashboard：`npm run web`
- 构建浏览器 Dashboard：`npm run web:build`
- 运行 Agent F 回归测试：`npm run test:agent-f`
- 运行全量测试：`npm test`
- 构建 TypeScript：`npm run build`
- 运行发布检查：`npm run release:check`

## 9. 如何判断项目是否工作正常

至少满足以下条件：

1. `npm run demo` 能输出结构完整的 JSON
2. `npm run demo:empty` 能输出 `NO_DATA` 主状态
3. `npm test` 通过
4. `npm run build` 通过
5. `npm run web:build` 通过

真实采集链路的自动测试与输入法验收步骤见 [Rime 上屏日志](./rime-journal.md#开发验证)。

如果你准备做发布前确认，再额外运行：

```bash
npm run release:check
```

## 10. 常见问题入口

如果你遇到问题，建议按这个顺序查：

1. [常见问题](./faq.md)
2. [演示操作手册](./demo/demo-playbook.md)
3. [完整测试指南](./testing/full-test-guide.md)
4. [发布指南](./release/release-guide.md)

## 11. 当前版本限制

- 当前主要依赖样例场景进行演示，不是完整的桌面 GUI 产品
- 目前没有打包安装器
- 真实输入法采集链路当前是 Rime Lua + CLI，没有托盘开关或 GUI 设置页
- ASCII 模式直接透传的英文按键不保证被记录；推荐用 Rime 英文候选或中英混输提交英文
- 一些 `docs/superpowers/**` 文档是研发过程资料，不是面向使用者的说明

## 12. 下一步该看什么

- 想全面测试：看 [testing/full-test-guide.md](./testing/full-test-guide.md)
- 想理解目录和代码：看 [developer-guide.md](./developer-guide.md)
- 想发布版本：看 [release/release-guide.md](./release/release-guide.md)
