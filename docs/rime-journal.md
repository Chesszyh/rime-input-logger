# Rime 上屏日志

本链路记录 Rime 最终提交到应用的文本，按天写入 JSONL（每行一个 JSON 对象），再用命令行查询事件和词频。Web Dashboard 可读取同一目录的真实日志并展示每日输入与词云；`npm run demo` 使用合成场景。命令行 `wordcloud` 输出词频表和 JSON 数据。

## 环境与安装

支持 Linux + Fcitx5 + Rime。安装支持 Lua 组件的 librime，以及一个已经可用的输入方案；本仓库不分发词库或整套输入方案。Fedora 对应的软件包为 `fcitx5-rime` 和 `librime-lua`；`fcitx5-lua` 不能替代 librime 插件。

Node.js 版本要求见 `package.json` 的 `engines`。运行测试还需要 Lua 5.3 或 5.4，且 `lua` 在 PATH 中。

在仓库根目录运行：

```bash
npm ci
npm run rime:journal -- --help
```

## 打开网页

在仓库根目录运行 `npm run web`，打开终端显示的本地地址（默认 http://127.0.0.1:5173）。页面默认读取本机日志；通过“数据设置”填写自定义 **raw 目录**，留空使用下文的默认路径。自定义目录保存在当前浏览器，不会修改采集器配置。

- **每日输入**：默认今天，按 Asia/Shanghai 日期切换；最新记录在前，可搜索、分批显示、导出所选日期全部事件 JSON。
- **词云**：展示最多 20 个词及其真实次数，可展开明细、导出统计 JSON。词频沿用 CLI 的过滤与分词规则，因此分析词次与原始输入字符数不同。
- **示例数据**：选择器可直接加载仓库合成日志，无需安装采集器；“数据设置”中另有原有分析演示入口。

页面每 5 秒重新读取文件，也可以点击“刷新”；后台更新保留当前内容、搜索条件与阅读方式。网页只读取日志，不安装采集器，也不写入或删除日志。无日志时可跳到最近有记录的日期或打开配置。无效行会跳过并显示数量，词云导出包含错误位置。

`npm run web:build` 生成前端文件；如需预览构建结果，运行 `npx vite preview --config apps/web-dashboard/vite.config.ts --host 127.0.0.1`。两种启动方式均提供本地日志接口。单独托管静态文件无法读取本机日志，长期运行与开机自启见下节。

## 本地服务与开机自启

```bash
npm ci
npm run web:build
npm run web:start
```

本地服务默认仅监听 `http://127.0.0.1:38761`，使用构建后的网页。可通过 `RIME_WEB_PORT` 修改端口。Linux 安装 systemd 用户服务：

```bash
npm run web:install-service
systemctl --user status rime-input-logger-web.service
journalctl --user -u rime-input-logger-web.service -n 30
```

安装脚本使用当前仓库与 Node.js 的绝对路径生成本机 unit，不将该配置放入 Git。自定义端口时使用 `RIME_WEB_PORT=38762 npm run web:install-service`。用户服务默认随登录启动；若需登录前启动，运行 `loginctl enable-linger "$USER"`。可用 `loginctl show-user "$USER" -p Linger` 确认。

更新代码后运行 `npm run web:build` 和 `systemctl --user restart rime-input-logger-web.service`。停止自启用 `systemctl --user disable --now rime-input-logger-web.service`。移动仓库或 Node.js 后重新运行安装命令。

## 连续片段

“每日输入”默认将相邻上屏拼接成连续片段。超过设定间隔（默认 15 秒，可选 5/30 秒）、跨天、输入方案变化或出现中文句末标点、问号、感叹号及换行时分段。文字按原样拼接，不补写英文或改写内容；切换“原始上屏”可逐条核对，JSON 导出始终保留原始事件。

这是基于停顿的阅读辅助，不能恢复应用内删除、光标移动或窗口切换；15 秒是可调的产品默认值，不是经过个体校准的语言学阈值。英文漏记与可扩展采集能力见 [输入行为与采集边界](./input-behavior.md)。

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
