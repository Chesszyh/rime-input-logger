# Agent B Sample Input / Output

## Sample input (records)

Range: `today` (`2026-03-30T00:00:00+08:00` ~ `2026-03-30T23:59:59+08:00`)

- `2026-03-30T09:12:00+08:00` text=`输入分析 输入分析`
- `2026-03-30T22:28:00+08:00` text=`词库迁移 共享契约`
- `2026-03-30T22:31:00+08:00` filtered=true (excluded from usable stats)

## Sample output mapping

### Overview / stats

- `input-chars`: `16`
- `input-entries`: `2`
- `active-days`: `1`
- `streak-days`: `1`
- `timeline[0].bucket`: `2026-03-30`

### Vocabulary insights

- `topTerms[0]`: `输入分析` (count=`2`)
- `newTerms`: contains `共享契约`
- `risingTerms`: contains `输入分析`
- `fallingTerms`: contains terms only present in previous window
- `phraseTerms`: contains long tokens / adjacent-token phrases

### Time & session

- `hourlyBuckets.length`: `24`
- `heatmap[*]`: grouped by `dateKey x 2-hour bucketLabel`
- `sessionSummary`: `{ count, averageDurationSeconds, longestDurationSeconds, focusSessionCount }`

### Summary fields

- `highlights`: short page-facing bullet strings
- `reportSummary`: highlights condensed into a single sentence for report card display
