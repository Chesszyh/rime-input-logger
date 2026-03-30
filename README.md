# Personal Input Analytics System

Personal Input Analytics System for Rime/Fcitx5 input capture, analytics, lexicon management, governance, and local-first reporting.

## Commands

- `npm install`
- `npm test`
- `npm run test:agent-f`
- `npm run demo`
- `npm run demo:empty`
- `npm run build`
- `npm run release:check`

## Quickstart

1. Run `npm install`.
2. Run `npm run demo` to view the main `normal-day` integrated flow.
3. Run `npm run demo:empty` to inspect the first-run / no-data path.
4. Run `npm run release:check` before publishing or merging release work.

## Agent B analytics

- Engine module: `packages/analytics/src/*`
- Service integration entry: `packages/services/src/index.ts`
- Verification:
  - `npm test`
  - `npm run build`
  - `npm run demo`

## Agent F verification

- Fixtures: `tests/fixtures/agent-f/**`
- Regression suites: `tests/agentF.regression.test.ts`, `tests/agentF.snapshots.test.ts`
- QA docs: `docs/qa/acceptance-checklist.md`, `docs/qa/risk-register.md`
- Verification:
  - `npm run test:agent-f`
  - `npm test`
  - `npm run build`

## Agent G delivery

- Demo entry: `apps/demo/src/index.ts`
- Demo config parsing: `apps/demo/src/config.ts`
- Demo playbook: `docs/demo/demo-playbook.md`
- Release guide: `docs/release/release-guide.md`
- Integration log: `docs/integration/agent-g-integration-log.md`
- Recommended operator path:
  - `npm run demo -- --scenario normal-day --preset last-7-days`
  - `npm run demo:empty`
  - `npm run release:check`
