# Agent F Risk Register

1. Fixture drift can occur if `packages/mock-data` or the service layer changes scenario math, sort order, or summary wording.
2. The ingestion fixture only covers one duplicate pattern and one cross-day session pattern, so other edge cases such as invalid timestamps and filtered records are still uncovered.
3. The dashboard snapshot intentionally trims the full bootstrap payload, so regressions in omitted fields like low-level time buckets or alternate vocabulary slices will not be caught here.
4. The governance export snapshot covers the masked default path only, so unmasked or stats-only export paths still need separate coverage.
5. The lexicon export snapshot covers only the `rime` format, so JSON and TSV export drift remain possible until they are explicitly snapshot-tested.
6. Live service output includes timestamped or request-scoped metadata that must be normalized during verification; forgetting that normalization will produce noisy diffs.
