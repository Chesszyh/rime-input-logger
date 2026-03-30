# Agent A Boundary Notes

## Scope

Agent A 只负责数据入口层：原始输入记录 -> 标准化事件流 -> 会话流与按日归档。
不负责词云、新词识别、趋势聚合与最终报告渲染。

## Processing Order

1. 记录开关与暂停状态判定
2. 时间合法性校验
3. 文本标准化与噪声过滤
4. 应用黑名单与文本规则过滤
5. 重复输入去噪
6. 会话切分与按日归档
7. 历史范围读取（today/last-7-days/custom/all-time）

## Boundary Behaviors

### 1) Recording disabled / paused

- `recordingEnabled = false` 或 `paused = true` 时，不产出 `events/sessions/dailyRecords`。
- 原始输入进入 `dropped`，原因分别为 `recording-disabled` / `recording-paused`。

### 2) Invalid timestamps

- `occurredAt` 无法解析时，该条记录不会进入事件流。
- 记录为 `dropped: { reason: "invalid-occurredAt" }`。

### 3) Noise handling

- 空文本（trim 后为空）标记为过滤事件，原因 `empty-text`。
- 纯符号文本标记为过滤事件，原因 `symbol-only`。
- 手动忽略标记为过滤事件，原因 `manual-ignore`。

### 4) Blacklist / sensitive rules

- 命中 app 规则时：`scope = "blocked"`，过滤原因写入 `filterReasons`。
- 命中 term/regex 规则时同样进入过滤事件。

### 5) Same-second multi-input and dedupe

- 同一秒多条输入允许存在。
- 仅当「同 app + 同归一化文本 + 在去重窗口内（默认 2 秒）」才判定重复并写入 `dropped: duplicate-input`。

### 6) Session split and cross-midnight

- 仅对非过滤事件切分会话。
- 相邻有效事件间隔 `> sessionGapSeconds` 时开启新会话。
- 同一会话跨自然日时，`crossedMidnight = true`。

### 7) Empty after filtering

- 当有效事件数为 0 时，返回空 `sessions`，但保留过滤事件与按日归档信息，供治理与可观测性页面使用。

### 8) Custom range precision

- `custom` 查询按 datetime 精确过滤，而不是仅按自然日过滤。
- 会话查询采用“时间区间重叠”语义：会话只要与查询区间有交集即返回。

## Consumer Contract

- 分析层（Agent B）只消费 `events` 与 `sessions`，不需要感知采集源细节。
- 页面或治理层可以读取 `dailyRecords` 与 `dropped` 进行状态提示、诊断与可解释展示。
