# 输入行为与采集边界

下一轮功能、优先级与验收口径见 [功能开发矩阵](./next-iteration-matrix.md)。目标是输入过程记录与行为分析，不还原应用最终正文。

## 连续片段如何生成

网页以原始上屏日志为依据，按停顿、句末标点、日期和输入方案变化分组。每个片段保留其原始事件，不把推测结果写回日志。

写作研究中的 pause bursts（由停顿划分的连续书写段）可作为参考。[Inputlog](https://www.inputlog.net/community/) 提供停顿与书写段分析，也介绍依据个人击键间隔确定阈值的方法。当前日志仅记录秒级上屏时间，不能直接套用毫秒级击键研究的阈值。当前实现结合可调间隔、焦点变化、组合取消和编辑边界判断分段。

## Shift 切换后的英文为何缺失

当前 Lua 采集器监听 `commit_notifier`，记录 Rime 提交的文本。纯英文模式没有组合内容时，Rime 的 `ascii_composer` 返回 `kRejected`，把按键交回前端处理，因此不会经过同一个提交通知；中文标点仍可能由 Rime 提交。[Rime 源码](https://github.com/rime/librime/blob/1.14.0/src/rime/gear/ascii_composer.cc)

用户实际使用中英文仍不可见，当前实现尚未通过实际 Shift 切换路径验收。隔离引擎测试通过不代表整条采集链路已覆盖。

当前实现使用 `unhandled_key_notifier` 观察 Rime 实际放行的英文可打印按键：仅在 `ascii_mode` 开启时记录，跳过按键释放与 Ctrl/Alt/Super 组合，不拦截或重新提交按键。退格、删除、回车、Tab、方向键及快捷键建立拼接边界。只覆盖到达 Rime 的按键，未把观察内容冒充应用最终正文；既有漏记无法补回。

Fcitx5 Lua 插件监听 FocusIn、FocusOut 和输入法切换，为每次边界生成不同标识。Rime 上屏与行为记录读取该标识，防止跨输入框拼接。插件不读取窗口标题或应用正文。焦点事件的时间是秒级；Rime 内部序号与进程 CPU 时钟仅用于同秒排序，CPU 时钟不能用来衡量真实打字耗时。

独立行为日志包括 `english_observation`、`composition_start`、`composition_end`（commit/cancel）、`mode_change`、编辑/快捷键边界、会话结束与焦点变化。网页导出同时保留确认上屏和行为记录，词云仍只统计确认上屏。安装方法见 [Rime 上屏日志](./rime-journal.md#连续片段与行为事件)。

## 还能分析什么

现有数据可分析每日上屏量、字符量、活跃时段、上屏间隔、连续片段长度、输入方案分布和词频变化。上屏间隔包含选词、停顿与应用操作，不能等同真实击键速度，也不能单凭它推断情绪或注意力。

[librime-lua 接口](https://github.com/hchunhui/librime-lua/blob/master/_autodocs/api-reference/context-engine.md) 支持组合更新、候选选择和模式变化通知；[KeyEvent](https://github.com/hchunhui/librime-lua/blob/master/_autodocs/api-reference/key-event.md) 提供按键与修饰键信息。扩展采集后可计算组合耗时、取消比例、退格频率、选词方式、中英文切换次数。毫秒级速度与停顿分析还需要可靠的高精度时间源。

当前已记录组合开始/结束、取消、模式切换及焦点边界；后续可增加候选选择与按键计数，并结合 Fcitx5 输入上下文细分应用。下一轮只扩展输入过程和编辑操作统计，不重建应用最终正文。
