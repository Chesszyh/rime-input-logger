# Full Test Guide

## Goal

This guide describes how to comprehensively test the Personal Input Analytics System from a fresh checkout through release verification.

## 1. Environment Setup

Run from repository root:

```bash
npm install
```

Expected result:

- Dependencies install without error
- `package-lock.json` matches the committed dependency graph

## 2. Fast Smoke Checks

Use these first after any change:

```bash
npm run demo -- --scenario normal-day --preset last-7-days
npm run demo:empty
```

What to look for:

- Both commands exit `0`
- Output is valid JSON
- `normal-day` shows `READY`
- `empty-history` shows `NO_DATA`

## 3. Agent F Regression And Snapshot Checks

These validate the most important end-to-end business paths:

```bash
npm run test:agent-f
```

Coverage includes:

- Empty data
- Duplicate input ingestion
- Cross-midnight session visibility
- Filtered-empty-result behavior
- Governance delete/retain flows
- Report export
- Lexicon export
- Snapshot baselines under `tests/fixtures/agent-f/**`

## 4. Full Automated Test Suite

Run the full suite before merge or release:

```bash
npm test
```

Current expected result:

- `16` test files
- `70` tests
- `0` failures

Suite coverage by area:

- Agent 0: contracts, workspace, fixtures
- Agent A: ingestion, session splitting
- Agent B: range, stats, vocabulary, time/session, service integration
- Agent C: lexicon management
- Agent D: dashboard/report assembly
- Agent E: governance
- Agent F: regression and snapshots
- Agent G: demo/release integration

## 5. Build Verification

Run the compile step to catch type and module regressions:

```bash
npm run build
```

Expected result:

- Exit code `0`
- No TypeScript errors

## 6. Fixture And Snapshot Verification

When output semantics change intentionally, compare live output with committed fixtures before updating them.

### Dashboard fixture

```bash
tsx -e "(async()=>{ const { createServiceRegistry } = await import('./packages/services/src/index.ts'); const services = createServiceRegistry(); const bootstrap = await services.dashboard.getDashboardBootstrap({ preset: 'last-7-days', scenarioId: 'normal-day' }); const subset = { scenarioId: bootstrap.scenarioId, overview: { range: bootstrap.overview.range, viewState: bootstrap.overview.viewState, metrics: bootstrap.overview.metrics, highlights: bootstrap.overview.highlights }, vocabulary: { viewState: bootstrap.vocabulary.viewState, topTerms: bootstrap.vocabulary.topTerms.slice(0, 3).map(({ term, kind, count, share }) => ({ term, kind, count, share })), phraseTerms: bootstrap.vocabulary.phraseTerms.slice(0, 3).map(({ term, kind, count, share }) => ({ term, kind, count, share })), fallingTerms: bootstrap.vocabulary.fallingTerms.map(({ term, kind, count, deltaFromPrevious }) => ({ term, kind, count, deltaFromPrevious })) }, timeActivity: { viewState: bootstrap.timeActivity.viewState, nonZeroHourlyBuckets: bootstrap.timeActivity.hourlyBuckets.filter((bucket) => bucket.chars > 0), heatmap: bootstrap.timeActivity.heatmap, sessions: bootstrap.timeActivity.sessions }, governance: { viewState: bootstrap.governance.viewState, retention: bootstrap.governance.settings.retention, lastOperation: bootstrap.governance.lastOperation }, report: { title: bootstrap.report.title, summary: bootstrap.report.summary, sections: bootstrap.report.sections, contentMasked: bootstrap.report.contentMasked } }; console.log(JSON.stringify(subset, null, 2)); })()" | diff -u tests/fixtures/agent-f/expected/dashboard-normal-day.json -
```

### Governance export fixture

```bash
tsx -e "(async()=>{ const { createServiceRegistry } = await import('./packages/services/src/index.ts'); const services = createServiceRegistry(); const exported = await services.governance.exportRecords({ scenarioId: 'normal-day', format: 'json', maskContent: false }); console.log(JSON.stringify({ scenarioId: 'normal-day', request: { format: 'json', maskContent: false }, output: { format: exported.format, masked: exported.output?.masked, exportedRecords: exported.output?.exportedRecords, sample: exported.output?.sample } }, null, 2)); })()" | diff -u tests/fixtures/agent-f/expected/governance-export-summary.json -
```

### Rime export fixture

```bash
tsx -e "(async()=>{ const { createServiceRegistry } = await import('./packages/services/src/index.ts'); const services = createServiceRegistry(); const rime = await services.lexicon.exportEntries({ scenarioId: 'normal-day', request: { format: 'rime', category: 'all' } }); console.log(rime.content.replace(/^# generatedAt: .*$/m, '# generatedAt: 2026-03-30T11:23:05.402Z')); })()" | diff -u tests/fixtures/agent-f/expected/lexicon-rime-export.txt -
```

If these diffs change unexpectedly, treat that as a regression until explained.

## 7. Release Gate

Run the operator-facing release gate:

```bash
npm run release:check
```

This runs:

1. `npm test`
2. `npm run build`
3. `npm run demo -- --scenario normal-day --preset last-7-days`

Use this before tagging or pushing release-bound work.

## 8. Manual Review Checklist

Before calling the project fully tested:

- Read `docs/qa/risk-register.md`
- Read `docs/release/final-preflight-checklist.md`
- Confirm `git status --short --branch` is clean
- Confirm the current branch contains the expected commits

## 9. When To Refresh Fixtures

Refresh `tests/fixtures/agent-f/**` only when:

- Scenario definitions changed intentionally
- Summary wording changed intentionally
- Export format changed intentionally

Do not refresh fixtures just to make a failing test pass without understanding why output changed.
