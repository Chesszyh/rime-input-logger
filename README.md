# Personal Input Analytics System

Agent 0 baseline for the personal input analytics project.

## Commands

- `npm install`
- `npm test`
- `npm run test:agent-f`
- `npm run demo`
- `npm run build`

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
