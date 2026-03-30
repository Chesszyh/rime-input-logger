# Agent B Analytics Edge Cases

## 1) Empty history (`NO_DATA`)

- Condition: scenario has zero records.
- Behavior: service returns `viewState.code = NO_DATA`.
- Output stability: metrics are zero-safe, `hourlyBuckets` always has 24 items, `timeline/heatmap/vocabulary` can be empty arrays.

## 2) Empty result after filtering/range (`EMPTY_RESULT`)

- Condition: records exist globally, but current range has no usable records (out of range, filtered, or deleted).
- Behavior: service returns `viewState.code = EMPTY_RESULT`.
- Output stability: overview/time/vocabulary slices remain structurally valid with empty or zeroed values.

## 3) Current vs previous window comparison

- Previous window is built as an adjacent, equal-duration interval immediately before current window.
- Rising/falling terms use `delta = currentCount - previousCount`.

## 4) Noise/stop-word pollution control

- Vocabulary analysis excludes events marked `isFiltered/isDeleted`.
- Stop words are removed before counting.
- Symbol-only / ultra-short noise tokens are ignored.

## 5) Cross-day and time bucket handling

- Range filtering uses timestamp inclusion (`startAt <= occurredAt <= endAt`).
- Time chart uses 24 fixed buckets (`0..23`).
- Heatmap uses deterministic 2-hour slices (`00:00-01:59`, ..., `22:00-23:59`).

## 6) Invalid or partial custom range input

- `custom` is only honored when both `startAt` and `endAt` exist.
- Missing boundaries fall back to preset boundary resolution to avoid runtime failures.
