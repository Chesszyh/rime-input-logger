# Field Dictionary And Naming

## Naming Rules

- 时间字段统一使用 `At` 后缀，类型为 ISO 8601 字符串，例如 `occurredAt`、`startedAt`。
- 按天归档统一使用 `dateKey`，格式为 `YYYY-MM-DD`。
- 页面数据对象统一以 `PageData` 结尾。
- 状态类字段优先使用枚举字面量，避免布尔组合歧义。
- 输入事件只在 `rawText`、`maskedText`、`normalizedText` 三个层面表达内容，不新增第四种文本字段。

## Key Fields

| Object | Field | Meaning |
| --- | --- | --- |
| `InputRecordEvent` | `scope` | 当前输入来源是否允许进入分析层 |
| `InputRecordEvent` | `isFiltered` | 该条记录是否被过滤或脱敏规则命中 |
| `InputRecordEvent` | `candidateIndex` | 候选上屏位次，供效率分析使用 |
| `InputSession` | `idleGapSeconds` | 切分该会话前允许的最大静默间隔 |
| `StatsSnapshot` | `metrics` | 仪表卡片数据，供总览页直接渲染 |
| `StatsSnapshot` | `hourlyBuckets` | 24 小时输入分布 |
| `VocabularyInsight` | `kind` | `top/new/rising/falling/stable/phrase` 之一 |
| `LexiconEntry` | `status` | 词库管理态，例如 `active`、`favorite`、`ignored` |
| `LexiconOverview` | `lowFrequencyStaleEntries` | 低频且超过阈值未使用的词条数量 |
| `LexiconQuery` | `category/sortBy/sortOrder` | 词条筛选与排序入口，支持高频、新增、低频陈旧等视图 |
| `LexiconExportRequest` | `format` | 导出格式，支持 `json`、`tsv`、`rime` |
| `UserSettings` | `retention.mode` | 原文保留、脱敏保留或仅保留统计 |
| `OperationEnvelope` | `errors` | 治理操作失败原因列表 |
| `ViewState` | `code` | 页面空态/错误态/暂停态统一入口 |

## Reserved View State Codes

- `READY`
- `NO_DATA`
- `EMPTY_RESULT`
- `PERMISSION_DENIED`
- `PAUSED`
- `ERROR`
