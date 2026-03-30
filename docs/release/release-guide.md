# Release Guide

## Minimum Release Gate

Run from repository root:

1. `npm run test:agent-f`
2. `npm test`
3. `npm run build`
4. `npm run release:check`

## What `release:check` Verifies

- Full Vitest suite passes.
- TypeScript build passes.
- Demo entry is runnable with the default integrated scenario.

## Packaging Scope

- App entry: `apps/demo/src/index.ts`
- Contracts: `packages/contracts/src/index.ts`
- Runtime services: `packages/services/src/*`
- Analytics engine: `packages/analytics/src/*`
- Dashboard/report assembly: `packages/dashboard/src/index.ts`
- Test and fixture assets: `tests/**`

## Common Failure Paths

- Demo fails with unknown scenario:
  - Cause: wrong CLI arg
  - Fix: use `normal-day`, `empty-history`, `filtered-day`, or `power-user-day`
- Build fails on fixture JSON typing:
  - Cause: fixture shape drifted from contracts
  - Fix: update the fixture or add explicit narrowing in tests
- Snapshot drift:
  - Cause: service behavior changed
  - Fix: rerun the acceptance checklist and intentionally refresh the expected output files
