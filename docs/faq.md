# FAQ

## 1. 这个项目现在是完整产品吗？

不是。当前仓库更准确地说是一套“可运行的分析与展示骨架”，已经具备：

- 共享契约
- 样例场景
- 分析引擎
- 服务聚合层
- demo CLI
- 回归测试与发布门禁

但还不是完整桌面 GUI 应用，也还没有打包安装器。

## 2. 没有安装 Rime/Fcitx5 能运行吗？

能。当前主线依赖内置样例场景，不要求本机具备真实输入法采集环境。

## 3. 最先应该跑哪个命令？

先跑：

```bash
npm install
npm run demo
```

如果你想看空数据状态，再跑：

```bash
npm run demo:empty
```

## 4. `npm run demo` 输出的 JSON 太长，先看哪里？

先看这几个字段：

- `demoConfig`
- `scenarioId`
- `navigation`
- `overview.metrics`
- `overview.highlights`
- `report.textPreview`

它们最能快速说明当前场景是否正常。

## 5. 有哪些可用场景？

当前常用场景包括：

- `normal-day`
- `empty-history`
- `power-user-day`
- `filtered-day`

## 6. 出现 `[demo] Unknown scenario` 怎么办？

通常是 `--scenario` 参数写错了。请使用项目内已有场景 ID，例如：

- `normal-day`
- `empty-history`
- `power-user-day`
- `filtered-day`

也可以先运行：

```bash
npm test
```

确认当前分支没有把场景注册弄坏。

## 7. 为什么报告默认是脱敏的？

这是治理默认值的一部分，目的是避免直接输出原始敏感内容。需要非脱敏内容时，可通过 demo 参数或服务层调用显式关闭。

## 8. 怎么全面测试这个项目？

按下面顺序：

```bash
npm install
npm run demo
npm run demo:empty
npm run test:agent-f
npm test
npm run build
npm run release:check
```

如果你还要验证基准输出是否漂移，再看 [testing/full-test-guide.md](./testing/full-test-guide.md) 里的 diff 命令。

## 9. 为什么测试数量会异常翻倍？

常见原因是把独立 git worktree 目录也一起扫进测试了。当前仓库已经通过：

- `vitest.config.ts`
- `tsconfig.json`

显式排除了 `.worktrees/**`。

## 10. `docs/superpowers/**` 是给谁看的？

这是研发过程中的设计文档和执行计划，主要给开发者和维护者看，不是面向最终使用者的操作文档。

## 11. 想了解每份文档的用途，看哪里？

看 [docs/README.md](./README.md)。这里面有 `docs/` 全目录导航，并解释了每份文档的作用。
