# Agent F Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Agent F verification assets that make the mainline behavior repeatable to validate locally, including fixtures, regression tests, acceptance snapshots, and QA docs.

**Architecture:** Keep Agent F additive. Reuse the existing `contracts`, `mock-data`, `services`, `dashboard`, and `governance` APIs instead of introducing new product behavior. Store reusable fixture inputs and expected outputs under `tests/fixtures/agent-f`, add business-facing regression tests under `tests/`, and document manual acceptance plus residual risks under `docs/qa`.

**Tech Stack:** TypeScript, Vitest, existing Node-based workspace scripts

---

### Task 1: Add Agent F Fixture Inputs And Snapshot Outputs

**Files:**
- Create: `tests/fixtures/agent-f/raw-input-records.json`
- Create: `tests/fixtures/agent-f/expected/dashboard-normal-day.json`
- Create: `tests/fixtures/agent-f/expected/governance-export-summary.json`
- Create: `tests/fixtures/agent-f/expected/lexicon-rime-export.txt`

- [ ] Define reusable raw-input samples covering duplicate input and跨日会话.
- [ ] Capture stable expected outputs for dashboard,治理导出,词库导出.
- [ ] Keep fixture values deterministic and aligned with existing scenario IDs.

### Task 2: Add Agent F Regression Tests

**Files:**
- Create: `tests/agentF.regression.test.ts`
- Create: `tests/agentF.snapshots.test.ts`

- [ ] Add business-facing regression coverage for empty data, duplicate data,跨日会话,过滤后无结果,删除/保留,报告导出,词库导出.
- [ ] Add snapshot-style comparisons against the committed expected outputs.
- [ ] Keep failure messages descriptive enough to locate the broken business path.

### Task 3: Add Agent F QA Docs And Script Wiring

**Files:**
- Create: `docs/qa/acceptance-checklist.md`
- Create: `docs/qa/risk-register.md`
- Modify: `package.json`
- Modify: `README.md`

- [ ] Write a local acceptance checklist with exact commands and expected observations.
- [ ] Record major residual risks and why they are not yet covered.
- [ ] Add a dedicated npm script for Agent F verification and document it.

### Task 4: Full Verification And Commit

**Files:**
- Modify: `tests/*` and `docs/qa/*` from previous tasks

- [ ] Run targeted Agent F tests.
- [ ] Run full `npm test`.
- [ ] Run `npm run build`.
- [ ] Run the new Agent F verification script.
- [ ] Commit with an Agent F specific message.
