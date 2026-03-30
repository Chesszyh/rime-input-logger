# Agent G Integration Log

## Integrated Modules

- Agent A ingestion service wired through `packages/services/src/ingestion.ts`
- Agent B analytics consumed by `packages/services/src/index.ts`
- Agent C lexicon operations consumed by demo output and regression tests
- Agent D dashboard/report experience consumed by demo output
- Agent E governance flows exercised by Agent F and release checks
- Agent F regression fixtures and snapshot assets included in release gate

## Decisions

- Kept the demo as a JSON-emitting CLI instead of adding a UI shell.
- Reused fixture scenarios as demo configuration to avoid introducing a second data source.
- Added `demo:empty` for the first-run path because it is a common onboarding failure case.
- Added `release:check` as the operator-facing pre-release command.

## Known Constraints

- Release packaging is source-based; no compiled tarball or installer is generated yet.
- Demo output is terminal JSON, not a screenshot asset.
- Snapshot fixtures must be refreshed intentionally when scenario math or wording changes.
