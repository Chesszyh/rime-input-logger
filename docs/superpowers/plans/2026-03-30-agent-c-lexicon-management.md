# Agent C Lexicon Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付可独立运行的词库资产管理与迁移导出能力，满足 Agent C 全部验收项。

**Architecture:** 在 Agent 0 基线上做最小侵入扩展：先扩展 contracts 定义词库管理接口，再增强 mock-data 场景，最后在 services 挂载 `lexicon` 命名空间并由 demo/tests 验证主线闭环。所有能力以纯函数处理场景数据，保证空态与过滤态稳定。

**Tech Stack:** TypeScript、Vitest、Node ESM、现有 monorepo workspaces

---

### Task 1: 扩展词库管理契约

**Files:**
- Modify: `packages/contracts/src/index.ts`
- Test: `tests/agentc.lexicon.test.ts`

- [ ] **Step 1: 写失败测试（先验证类型可被服务层消费）**

```ts
import { describe, expect, it } from "vitest";
import type { LexiconOverview, LexiconQuery, LexiconExportRequest } from "../packages/contracts/src/index";

describe("agent c contract surface", () => {
  it("exposes lexicon management types", () => {
    const query: LexiconQuery = {
      category: "all",
      search: "",
      sortBy: "usage-count",
      sortOrder: "desc"
    };
    const req: LexiconExportRequest = {
      format: "json",
      category: "all"
    };
    const overview: LexiconOverview = {
      totalEntries: 0,
      newEntries: 0,
      highFrequencyEntries: 0,
      lowFrequencyStaleEntries: 0,
      phraseEntries: 0,
      favoriteEntries: 0,
      ignoredEntries: 0,
      deletedEntries: 0
    };

    expect(query.category).toBe("all");
    expect(req.format).toBe("json");
    expect(overview.totalEntries).toBe(0);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/agentc.lexicon.test.ts`
Expected: FAIL（缺少 `LexiconOverview` / `LexiconQuery` / `LexiconExportRequest` 等类型）

- [ ] **Step 3: 在 contracts 增加 Agent C 类型**

```ts
export type LexiconFilterCategory =
  | "all"
  | "high-frequency"
  | "new"
  | "low-frequency-stale"
  | "phrase"
  | "favorite"
  | "ignored"
  | "deleted"
  | "domain"
  | "general"
  | "noise";

export interface LexiconOverview {
  totalEntries: number;
  newEntries: number;
  highFrequencyEntries: number;
  lowFrequencyStaleEntries: number;
  phraseEntries: number;
  favoriteEntries: number;
  ignoredEntries: number;
  deletedEntries: number;
}
```

- [ ] **Step 4: 重新运行测试确认通过**

Run: `npm test -- tests/agentc.lexicon.test.ts`
Expected: PASS（类型可用）

- [ ] **Step 5: 提交本任务**

```bash
git add packages/contracts/src/index.ts tests/agentc.lexicon.test.ts
git commit -m "feat: add lexicon management contracts"
```

### Task 2: 增强词库样例数据覆盖 Agent C 场景

**Files:**
- Modify: `packages/mock-data/src/index.ts`
- Test: `tests/agentc.lexicon.test.ts`

- [ ] **Step 1: 写失败测试（验证样例覆盖高频新增与低频陈旧）**

```ts
it("provides fixture lexicon entries for high-frequency-new and low-frequency-stale", async () => {
  const services = createServiceRegistry();
  const highNew = await services.lexicon.identifyHighFrequencyNew({ scenarioId: "normal-day" });
  const stale = await services.lexicon.identifyLowFrequencyStale({ scenarioId: "normal-day" });

  expect(highNew.length).toBeGreaterThan(0);
  expect(stale.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/agentc.lexicon.test.ts`
Expected: FAIL（`services.lexicon` 不存在 / 样例不足）

- [ ] **Step 3: 扩展 `normal-day` 词库样例条目**

```ts
const normalLexicon: LexiconEntry[] = [
  // 高频稳定词
  // 高频新增词（firstSeen 最近 7 天且 usageCount >= 5）
  // 低频陈旧词（usageCount <= 2 且 lastSeen 超过 30 天）
  // 短语词 / 收藏词 / 忽略词
];
```

- [ ] **Step 4: 运行测试确认样例可支撑识别**

Run: `npm test -- tests/agentc.lexicon.test.ts`
Expected: FAIL 变为下一类失败（通常只剩服务实现未完成）

- [ ] **Step 5: 提交本任务**

```bash
git add packages/mock-data/src/index.ts tests/agentc.lexicon.test.ts
git commit -m "feat: enrich lexicon fixtures for agent c scenarios"
```

### Task 3: 实现 `services.lexicon` 查询/操作/导出/迁移

**Files:**
- Modify: `packages/services/src/index.ts`
- Test: `tests/agentc.lexicon.test.ts`

- [ ] **Step 1: 写失败测试（覆盖筛选、操作、导出、迁移助手）**

```ts
it("supports lexicon filtering, mutation and export", async () => {
  const services = createServiceRegistry();

  const list = await services.lexicon.listEntries({
    scenarioId: "normal-day",
    query: { category: "high-frequency", search: "", sortBy: "usage-count", sortOrder: "desc" }
  });
  expect(list.total).toBeGreaterThan(0);

  const mutation = await services.lexicon.mutateEntries({
    scenarioId: "normal-day",
    request: { action: "favorite", entryIds: [list.entries[0].id] }
  });
  expect(mutation.updatedCount).toBe(1);

  const exported = await services.lexicon.exportEntries({
    scenarioId: "normal-day",
    request: { format: "rime", category: "all" }
  });
  expect(exported.content).toContain("\t");

  const guide = await services.lexicon.getMigrationGuide({ scenarioId: "normal-day", format: "rime" });
  expect(guide.steps.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/agentc.lexicon.test.ts`
Expected: FAIL（`lexicon` 服务缺失）

- [ ] **Step 3: 在服务注册表中实现 `lexicon` 命名空间**

```ts
lexicon: {
  async getOverview(...) { ... },
  async listEntries(...) { ... },
  async identifyLowFrequencyStale(...) { ... },
  async identifyHighFrequencyNew(...) { ... },
  async mutateEntries(...) { ... },
  async exportEntries(...) { ... },
  async getMigrationGuide(...) { ... }
}
```

- [ ] **Step 4: 确保操作与导出口径显式可测**

```ts
const isLowFrequencyStale = (entry: LexiconEntry, referenceAt: string) =>
  entry.usageCount <= 2 && daysBetween(entry.lastSeenAt, referenceAt) > 30;

const isHighFrequencyNew = (entry: LexiconEntry, referenceAt: string) =>
  entry.usageCount >= 5 && daysBetween(entry.firstSeenAt, referenceAt) <= 7;
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- tests/agentc.lexicon.test.ts`
Expected: PASS

- [ ] **Step 6: 提交本任务**

```bash
git add packages/services/src/index.ts tests/agentc.lexicon.test.ts
git commit -m "feat: implement lexicon service operations and export"
```

### Task 4: 更新 demo 输出与全量回归验证

**Files:**
- Modify: `apps/demo/src/index.ts`
- Test: `tests/agentc.lexicon.test.ts`
- Test: `tests/agent0.fixtures.test.ts`
- Test: `tests/agent0.contracts.test.ts`
- Test: `tests/agent0.workspace.test.ts`

- [ ] **Step 1: 写失败测试（验证 demo 路径可读取 lexicon 能力）**

```ts
it("keeps dashboard baseline while exposing lexicon service", async () => {
  const services = createServiceRegistry();
  const overview = await services.lexicon.getOverview({ scenarioId: "normal-day" });
  expect(overview.totalEntries).toBeGreaterThan(0);
});
```

- [ ] **Step 2: 更新 demo 展示词库能力**

```ts
const lexiconOverview = await services.lexicon.getOverview({ scenarioId: "normal-day" });
const rimeExport = await services.lexicon.exportEntries({
  scenarioId: "normal-day",
  request: { format: "rime", category: "all" }
});
```

- [ ] **Step 3: 运行单测 + 构建 + demo**

Run: `npm test`
Expected: PASS

Run: `npm run build`
Expected: PASS

Run: `npm run demo`
Expected: 输出包含词库总览指标与导出示例片段

- [ ] **Step 4: 提交本任务**

```bash
git add apps/demo/src/index.ts tests/agentc.lexicon.test.ts
git commit -m "feat: add lexicon management demo and regression coverage"
```

### Task 5: 文档对齐（可选但推荐）

**Files:**
- Modify: `docs/reference/field-dictionary.md`
- Modify: `docs/contracts/shared-contract.md`

- [ ] **Step 1: 更新字段字典中的 Agent C 新增类型说明**

```md
| `LexiconOverview` | `lowFrequencyStaleEntries` | 低频且超过阈值未使用的词条数量 |
```

- [ ] **Step 2: 更新共享契约文档的服务接口描述**

```md
- `lexicon.getOverview/listEntries/mutateEntries/exportEntries/getMigrationGuide`
```

- [ ] **Step 3: 运行测试确认无回归**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: 提交本任务**

```bash
git add docs/reference/field-dictionary.md docs/contracts/shared-contract.md
git commit -m "docs: document lexicon management contract and service"
```

---

## Self-Review

- Spec coverage: Agent C 必选项（总览、筛选、搜索、排序、操作、导出、迁移助手、识别）均已映射到 Task 1~4。
- Placeholder scan: 无 `TODO/TBD`，每个任务包含明确文件、命令与预期输出。
- Type consistency: `LexiconOverview/LexiconQuery/LexiconExportRequest` 在所有任务中命名一致。
