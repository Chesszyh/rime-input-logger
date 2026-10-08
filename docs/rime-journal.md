# Rime 上屏日志

本链路记录 Rime 最终提交到应用的文本，按天写入 JSONL（每行一个 JSON 对象），再用命令行查询事件和词频。Web Dashboard 和 `npm run demo` 使用合成场景，不读取这些真实日志。`wordcloud` 输出词频表和 JSON 数据，不生成图片。

## 环境与安装

支持 Linux + Fcitx5 + Rime。安装支持 Lua 组件的 librime，以及一个已经可用的输入方案；本仓库不分发词库或整套输入方案。Fedora 对应的软件包为 `fcitx5-rime` 和 `librime-lua`；`fcitx5-lua` 不能替代 librime 插件。

Node.js 版本要求见 `package.json` 的 `engines`。运行测试还需要 Lua 5.3 或 5.4，且 `lua` 在 PATH 中。

在仓库根目录运行：

```bash
npm ci
npm run rime:journal -- --help
```

## 先用合成日志验证命令

仓库的 `examples/journal/raw/2026-06-08.jsonl` 是人工编写的两条样例，不含真实输入。

```bash
npm run rime:journal -- events --raw-dir examples/journal/raw --date 2026-06-08
npm run rime:journal -- wordcloud --raw-dir examples/journal/raw --week 2026-W24
npm --silent run rime:journal -- events --raw-dir examples/journal/raw --date 2026-06-08 --format json
```

最后一条命令只输出 JSON，可重定向给其他程序。事件数应为 2，词频表应包含“输入分析”。

## 安装采集器

Fcitx5 的 Rime 用户目录通常是 `~/.local/share/fcitx5/rime`。若设置了 `XDG_DATA_HOME`，使用对应目录。以下命令在仓库根目录执行：

```bash
rime_user_dir="${XDG_DATA_HOME:-$HOME/.local/share}/fcitx5/rime"
mkdir -p "$rime_user_dir/lua"
cp rime/lua/commit_logger.lua "$rime_user_dir/lua/commit_logger.lua"
```

在实际使用方案的 `<schema_id>.custom.yaml` 中加入 [配置示例](../rime/schema.custom.yaml.example) 的内容。例如 `rime_ice` 对应 `rime_ice.custom.yaml`，小鹤双拼对应 `double_pinyin_flypy.custom.yaml`。

已有文件时，将三个键合并到已有的 `patch:` 下，不覆盖其他补丁，也不重复创建 `patch:`。每个需要记录的方案分别配置；不修改上游 `.schema.yaml`。若处理器列表已有 `lua_processor@*commit_logger`，保留一个即可。

将处理器放在列表首位，是为了在后续处理器消费按键前连接提交通知。`@*commit_logger` 会加载 `lua/commit_logger.lua`，不需要另写 `rime.lua`。

在 Fcitx5 的 Rime 菜单执行“重新部署”，等待完成。重新加载 Fcitx5 配置不能代替 Rime 重新部署。切换到配置过的方案，在普通文本框提交“输入分析”，然后运行：

```bash
npm run rime:journal -- events --preset today
```

应看到刚提交的文本。ASCII 模式直接透传的按键不一定触发 Rime commit；采集器不记录全局键盘事件，也不识别应用名称。

## 日志位置与配置

默认根目录是 `~/.local/share/personal-input-analytics`，原始日志为 `raw/YYYY-MM-DD.jsonl`。记录包含时间及偏移、方案、文本、可用时的输入编码、语言和字符数。原始日志存储明文；采集器不会执行 Dashboard 演示中的保留或脱敏策略。

采集器根目录依次取 `RIME_COMMIT_LOG_ROOT`、schema 的 `commit_logger/root`、默认值。命令行依次取 `--raw-dir`、`--root`、`RIME_COMMIT_LOG_ROOT`、默认值。命令行不读取 Rime 的 schema；改了 schema 路径后，查询时使用同一个 `--root`。

环境变量必须由 Fcitx5 进程继承；在另一个终端执行 `export` 不会改变正在运行的 Fcitx5。路径示例：

```bash
npm run rime:journal -- init --root /path/to/journal
npm run rime:journal -- events --root /path/to/journal --preset today
```

设置 `commit_logger/debug: true` 并重新部署，或让 Fcitx5 继承 `RIME_COMMIT_LOG_DEBUG=1`，可在根目录的 `debug.log` 查看初始化与写入诊断。调试日志包含输入编码，用完关闭。

要停用采集，从对应 custom 配置移除该处理器补丁并重新部署；已有日志保留。

## 查询与时间范围

```bash
npm run rime:journal -- wordcloud --preset last-7-days --limit 30
npm run rime:journal -- events --date 2026-06-08 --format json
npm run rime:journal -- wordcloud --week 2026-W24
npm run rime:journal -- events --start-at 2026-06-08T09:00:00+08:00 --end-at 2026-06-08T12:00:00+08:00
```

`--date`、`--week`、`--preset`、起止时间四种选择方式互斥。日期、周和相对预设按 Asia/Shanghai（UTC+08:00）统计；采集器的文件日期取主机本地日期，使用本链路时让采集主机使用同一时区。周从周一开始。默认查询今天，事件默认最多 200 条，词频默认最多 30 项。`--limit` 可调整数量。`--now` 可固定预设的参考时刻，便于复现测试。

坏行会被跳过；Markdown 显示错误数量，JSON 的 `source.parseErrors` 提供文件和行号。词频统计复用分析层的停用词和过滤规则，可能少于原始事件数。

## 开发验证

```bash
npm run test:rime
npm run release:check
```

`test:rime` 覆盖 JSONL 解析、日期查询、命令参数，以及 Lua 采集器在模拟 Rime 通知下写文件并交给 TypeScript 读取的链路。它不替代真实 Fcitx5 输入验收。`release:check` 运行全量测试、TypeScript 编译、浏览器构建和 demo。

## 排查

没有文件时，检查当前方案是否加载了补丁、librime-lua 是否安装、是否执行了 Rime 重新部署，以及采集与查询的根目录是否一致。Rime 日志中的 `error creating processor: 'lua_processor'` 通常表明 Lua 插件没有成功加载。

官方参考：[Rime 配置补丁](https://github.com/rime/home/wiki/Configuration)、[librime-lua](https://github.com/hchunhui/librime-lua)。
