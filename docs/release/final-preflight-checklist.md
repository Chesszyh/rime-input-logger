# Final Preflight Checklist

## Scope

Use this checklist immediately before publishing, tagging, or merging release-bound work from `master`.

## Required Checks

- [ ] `git status --short --branch` shows a clean working tree on `master`
- [ ] `npm run test:agent-f` passes
- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] `npm run web:build` passes
- [ ] `npm run demo -- --scenario normal-day --preset last-7-days` exits successfully
- [ ] `npm run demo:empty` exits successfully
- [ ] `npm run release:check` passes
- [ ] `docs/qa/acceptance-checklist.md` has been reviewed against the current branch
- [ ] `docs/release/release-guide.md` still matches the current scripts and operator flow

## Expected Evidence

- Test suite: `24` files, `79` tests, `0` failures
- Agent F suite: `2` files, `9` tests, `0` failures
- Build: TypeScript compile exits `0`
- Web build: Vite production build exits `0`
- Demo commands: print valid JSON payloads for both mainline and empty-history flows
- Release check: completes end-to-end without manual intervention

## Failure Triage

- `npm run test:agent-f` fails:
  - Check fixture drift under `tests/fixtures/agent-f/**`
  - Re-run the diff commands in `docs/qa/acceptance-checklist.md`
- `npm test` fails:
  - Fix the failing business path before continuing
  - Do not rely on partial green subsets
- `npm run build` fails:
  - Resolve typing or module path regressions before release
- `npm run web:build` fails:
  - Check `apps/web-dashboard/src/**` for browser-only import or rendering regressions
- Demo command fails:
  - Check `apps/demo/src/config.ts`
  - Confirm scenario IDs from `services.meta.listFixtureScenarios()`

## Release Note

As of the current integrated baseline, release readiness depends on source-based verification. There is no packaged installer yet, so successful release means:

1. The repo can be installed with `npm install`
2. The CLI demo can run locally
3. The Web Dashboard can complete a production build
4. The regression and snapshot assets stay aligned with the service output
