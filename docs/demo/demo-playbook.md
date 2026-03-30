# Demo Playbook

## Goal

Provide the shortest reproducible walkthrough for a first-time operator.

## Commands

1. `npm install`
2. `npm run demo`
3. `npm run demo:empty`

## Expected Flow

1. `npm run demo` prints one JSON payload containing:
   - `demoConfig`
   - `scenarioId`
   - `navigation`
   - `overview`, `stats`, `vocabulary`, `time`, `lexicon`, `report`
2. The default path should use `normal-day` + `last-7-days`.
3. The overview highlights should mention the current range, active days, and a semantic high-frequency term.
4. The report preview should show masked output by default.

## Alternate Scenarios

- `npm run demo -- --scenario filtered-day --preset today`
- `npm run demo -- --scenario power-user-day --preset last-30-days`
- `npm run demo:empty`

## Failure Hints

- If the command exits with `[demo] Unknown scenario`, run `npm test` first and use one of the fixture scenario IDs.
- If the output is missing JSON structure, confirm `apps/demo/src/index.ts` is still the entrypoint in `package.json`.
