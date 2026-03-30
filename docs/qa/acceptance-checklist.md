# Agent F Acceptance Checklist

Run these checks from the repository root inside `.worktrees/agent-f-testing`.

1. Verify the existing suites still pass:

```bash
npx vitest run tests/agentA.ingestion.test.ts tests/agentB.services.integration.test.ts tests/agentD.dashboard.test.ts tests/agentE.governance.test.ts tests/agentc.lexicon.test.ts
```

Expected observations:

- The ingestion suite still reports one dropped duplicate input and one cross-midnight session in the representative cases.
- The dashboard suite still reports `READY` for `normal-day` and `NO_DATA` for `empty-history`.
- The governance suite still reports masked exports by default and keeps confirmation checks intact.
- The lexicon suite still reports a deterministic `rime` export header and tab-delimited body.

2. Compare the committed dashboard snapshot against the live service output:

```bash
tsx -e "(async()=>{ const { createServiceRegistry } = await import('./packages/services/src/index.ts'); const services = createServiceRegistry(); const bootstrap = await services.dashboard.getDashboardBootstrap({ preset: 'last-7-days', scenarioId: 'normal-day' }); const subset = { scenarioId: bootstrap.scenarioId, overview: { range: bootstrap.overview.range, viewState: bootstrap.overview.viewState, metrics: bootstrap.overview.metrics, highlights: bootstrap.overview.highlights }, vocabulary: { viewState: bootstrap.vocabulary.viewState, topTerms: bootstrap.vocabulary.topTerms.slice(0, 3).map(({ term, kind, count, share }) => ({ term, kind, count, share })), phraseTerms: bootstrap.vocabulary.phraseTerms.slice(0, 3).map(({ term, kind, count, share }) => ({ term, kind, count, share })), fallingTerms: bootstrap.vocabulary.fallingTerms.map(({ term, kind, count, deltaFromPrevious }) => ({ term, kind, count, deltaFromPrevious })) }, timeActivity: { viewState: bootstrap.timeActivity.viewState, nonZeroHourlyBuckets: bootstrap.timeActivity.hourlyBuckets.filter((bucket) => bucket.chars > 0), heatmap: bootstrap.timeActivity.heatmap, sessions: bootstrap.timeActivity.sessions }, governance: { viewState: bootstrap.governance.viewState, retention: bootstrap.governance.settings.retention, lastOperation: bootstrap.governance.lastOperation }, report: { title: bootstrap.report.title, summary: bootstrap.report.summary, sections: bootstrap.report.sections, contentMasked: bootstrap.report.contentMasked } }; console.log(JSON.stringify(subset, null, 2)); })()" | diff -u tests/fixtures/agent-f/expected/dashboard-normal-day.json -
```

Expected observations:

- No diff output.
- The `lastOperation` block remains stable because it comes from the fixture scenario, not the live timestamped governance envelope.

3. Compare the governance export summary against the live service output:

```bash
tsx -e "(async()=>{ const { createServiceRegistry } = await import('./packages/services/src/index.ts'); const services = createServiceRegistry(); const exported = await services.governance.exportRecords({ scenarioId: 'normal-day', format: 'json', maskContent: false }); console.log(JSON.stringify({ scenarioId: 'normal-day', request: { format: 'json', maskContent: false }, output: { masked: exported.output?.masked, exportedRecords: exported.output?.exportedRecords, sample: exported.output?.sample } }, null, 2)); })()" | diff -u tests/fixtures/agent-f/expected/governance-export-summary.json -
```

Expected observations:

- No diff output.
- The export stays masked because the `normal-day` scenario defaults to `store-masked`.

4. Compare the lexicon export sample against the live service output after normalizing the timestamp line:

```bash
tsx -e "(async()=>{ const { createServiceRegistry } = await import('./packages/services/src/index.ts'); const services = createServiceRegistry(); const rime = await services.lexicon.exportEntries({ scenarioId: 'normal-day', request: { format: 'rime', category: 'all' } }); console.log(rime.content.replace(/^# generatedAt: .*$/m, '# generatedAt: 2026-03-30T11:23:05.402Z')); })()" | diff -u tests/fixtures/agent-f/expected/lexicon-rime-export.txt -
```

Expected observations:

- No diff output.
- The body remains sorted by usage count, with `输入分析` first and `旧版术语` still present as the smallest retained entry.
