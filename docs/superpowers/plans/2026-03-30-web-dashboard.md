# Web Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first Web Dashboard that turns the existing CLI analytics flow into a browsable React UI with scenario switching, preset switching, and six read-only product pages.

**Architecture:** Add a new standalone Vite + React + TypeScript app under `apps/web-dashboard` that imports the existing `contracts`, `services`, and `dashboard` packages directly in-browser. Keep presentation concerns inside the app by introducing a thin `view-model` layer and page-focused components, while reusing the current `createServiceRegistry()` and `buildDashboardExperience()` pipeline for data assembly.

**Tech Stack:** React, Vite, TypeScript, Vitest, Testing Library, existing workspace packages

---

## File Structure

### New App

- `apps/web-dashboard/vite.config.ts`
  - Vite config for the standalone web app, including the correct `root` for `apps/web-dashboard`.
- `apps/web-dashboard/index.html`
  - Browser entry with viewport metadata.
- `apps/web-dashboard/src/main.tsx`
  - React mount entry.
- `apps/web-dashboard/src/App.tsx`
  - Root app shell, data loading orchestration, and global state wiring.
- `apps/web-dashboard/src/styles/reset.css`
  - Minimal reset.
- `apps/web-dashboard/src/styles/theme.css`
  - CSS variables, typography imports, color tokens, motion guards.
- `apps/web-dashboard/src/styles/layout.css`
  - App shell, grids, cards, responsive breakpoints.

### App State And Data

- `apps/web-dashboard/src/lib/app-config.ts`
  - Scenario IDs, preset lists, labels, defaults.
- `apps/web-dashboard/src/lib/dashboard-client.ts`
  - Calls `createServiceRegistry()` and assembles the combined UI data payload, including lexicon highlights and export preview data.
- `apps/web-dashboard/src/lib/view-models/dashboard-view-model.ts`
  - Maps service/bootstrap outputs into component-friendly UI sections.
- `apps/web-dashboard/src/lib/view-models/lexicon-view-model.ts`
  - Maps lexicon overview/list data for cards and tables.
- `apps/web-dashboard/src/lib/view-models/report-view-model.ts`
  - Maps report templates and preview state.
- `apps/web-dashboard/src/lib/formatters.ts`
  - Shared formatting helpers for counts, durations, state labels.

### Components

- `apps/web-dashboard/src/components/app-shell.tsx`
  - Sidebar + header + content shell.
- `apps/web-dashboard/src/components/sidebar-nav.tsx`
  - Page navigation with view-state badges.
- `apps/web-dashboard/src/components/topbar-controls.tsx`
  - Scenario switcher, preset switcher, report toggles, current range summary, and page-level status hint.
- `apps/web-dashboard/src/components/state-badge.tsx`
  - Colored state code badge.
- `apps/web-dashboard/src/components/metric-grid.tsx`
  - KPI card grid.
- `apps/web-dashboard/src/components/chart-card.tsx`
  - Shared chart panel frame.
- `apps/web-dashboard/src/components/simple-line-chart.tsx`
  - Lightweight SVG or library-backed trend chart.
- `apps/web-dashboard/src/components/simple-bar-chart.tsx`
  - Horizontal/vertical bar chart.
- `apps/web-dashboard/src/components/heatmap-grid.tsx`
  - Heatmap cell matrix.
- `apps/web-dashboard/src/components/tag-cloud.tsx`
  - Weighted tag cloud for vocabulary.
- `apps/web-dashboard/src/components/empty-state-panel.tsx`
  - Reusable empty-state and explanation block.
- `apps/web-dashboard/src/components/error-banner.tsx`
  - Reusable error presentation with retry.
- `apps/web-dashboard/src/components/section-card.tsx`
  - Generic framed content card.
- `apps/web-dashboard/src/components/lexicon-table.tsx`
  - Read-only lexicon table with mobile overflow handling.

### Pages

- `apps/web-dashboard/src/pages/overview-page.tsx`
- `apps/web-dashboard/src/pages/stats-page.tsx`
- `apps/web-dashboard/src/pages/vocabulary-page.tsx`
- `apps/web-dashboard/src/pages/time-page.tsx`
- `apps/web-dashboard/src/pages/lexicon-page.tsx`
- `apps/web-dashboard/src/pages/report-page.tsx`

### Tests

- `apps/web-dashboard/src/__tests__/app.smoke.test.tsx`
  - Root render smoke test.
- `apps/web-dashboard/src/__tests__/data-client.test.ts`
  - Client aggregation and preset-driven data loading behavior.
- `apps/web-dashboard/src/__tests__/controls.test.tsx`
  - Scenario/preset switching behavior.
- `apps/web-dashboard/src/__tests__/empty-state.test.tsx`
  - Empty history and empty-result rendering.
- `apps/web-dashboard/src/__tests__/accessibility.test.tsx`
  - Keyboard navigation, focus visibility, and announced error semantics.
- `apps/web-dashboard/src/__tests__/report-options.test.tsx`
  - Report option toggles affect preview state.

### Root Workspace Updates

- `package.json`
  - Add web app start/build/test scripts and UI dependencies.
- `tsconfig.json`
  - Ensure web app files are included.
- `vitest.config.ts`
  - Support jsdom/browser-oriented app tests while keeping current excludes.
- `README.md`
  - Add Web Dashboard quickstart.
- `docs/user-guide.md`
  - Add browser dashboard usage path.
- `docs/developer-guide.md`
  - Add web app structure and commands.
- `docs/demo/demo-playbook.md`
  - Reference browser dashboard when relevant.
- `docs/testing/full-test-guide.md`
  - Add web dashboard test steps.

## Task 1: Add Workspace Dependencies And Web App Scaffold

**Files:**
- Create: `apps/web-dashboard/vite.config.ts`
- Create: `apps/web-dashboard/index.html`
- Create: `apps/web-dashboard/src/main.tsx`
- Create: `apps/web-dashboard/src/App.tsx`
- Create: `apps/web-dashboard/src/styles/reset.css`
- Create: `apps/web-dashboard/src/styles/theme.css`
- Create: `apps/web-dashboard/src/styles/layout.css`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Write the failing scaffold test**

Create `apps/web-dashboard/src/__tests__/app.smoke.test.tsx` with a single test that imports `App` and expects a visible shell title like `"Personal Input Analytics"`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web-dashboard/src/__tests__/app.smoke.test.tsx`
Expected: FAIL because the app files and/or React testing setup do not exist yet.

- [ ] **Step 3: Add minimal workspace dependencies**

Update `package.json` to add the minimal dependencies needed for the app:

- runtime: `react`, `react-dom`, optionally one lightweight chart library if needed
- dev: `vite`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`

Also add scripts such as:

- `web`: `vite --config apps/web-dashboard/vite.config.ts`
- `web:build`: `vite build --config apps/web-dashboard/vite.config.ts`
- `test:web`: `vitest run apps/web-dashboard/src/__tests__`

- [ ] **Step 4: Add minimal Vite + React scaffold**

Create:

- `apps/web-dashboard/vite.config.ts`
- `apps/web-dashboard/index.html`
- `apps/web-dashboard/src/main.tsx`
- `apps/web-dashboard/src/App.tsx`

Render a placeholder shell with one heading and one main region.

In `apps/web-dashboard/vite.config.ts`, explicitly configure the app root so Vite resolves `apps/web-dashboard/index.html` correctly for both dev and build commands.

- [ ] **Step 5: Add minimal style foundation**

Create `reset.css`, `theme.css`, and `layout.css` with:

- Fira Code + Fira Sans imports
- CSS variables for primary, secondary, accent, background, text
- viewport-safe layout wrappers
- reduced-motion guard

- [ ] **Step 6: Update TypeScript and Vitest config**

Ensure:

- `tsconfig.json` includes `apps/web-dashboard/**/*.ts` and `apps/web-dashboard/**/*.tsx`
- `tsconfig.json` enables JSX via `compilerOptions.jsx`
- `tsconfig.json` adds `DOM` and `DOM.Iterable` to `compilerOptions.lib`
- `vitest.config.ts` supports `jsdom` for web-dashboard tests without affecting current Node tests
- `vitest.config.ts` loads a setup file for `@testing-library/jest-dom`
- create `apps/web-dashboard/src/test/setup.ts` and import `@testing-library/jest-dom`

- [ ] **Step 7: Run scaffold test to verify it passes**

Run: `npx vitest run apps/web-dashboard/src/__tests__/app.smoke.test.tsx`
Expected: PASS

- [ ] **Step 8: Commit**

Run:

```bash
git add package.json tsconfig.json vitest.config.ts apps/web-dashboard
git commit -m "feat: scaffold web dashboard app"
```

## Task 2: Add App Config, Data Client, And View-Model Layer

**Files:**
- Create: `apps/web-dashboard/src/lib/app-config.ts`
- Create: `apps/web-dashboard/src/lib/dashboard-client.ts`
- Create: `apps/web-dashboard/src/lib/view-models/dashboard-view-model.ts`
- Create: `apps/web-dashboard/src/lib/view-models/lexicon-view-model.ts`
- Create: `apps/web-dashboard/src/lib/view-models/report-view-model.ts`
- Create: `apps/web-dashboard/src/lib/formatters.ts`
- Create: `apps/web-dashboard/src/__tests__/data-client.test.ts`
- Create: `apps/web-dashboard/src/__tests__/controls.test.tsx`
- Modify: `apps/web-dashboard/src/App.tsx`

- [ ] **Step 1: Write the failing data orchestration tests**

Create `apps/web-dashboard/src/__tests__/data-client.test.ts` with tests that:

- load `normal-day` with `last-7-days`
- then load `normal-day` with `last-30-days`
- assert the returned range label or preset-backed summary changes
- assert the combined payload includes:
  - lexicon overview
  - high-frequency-new items
  - low-frequency-stale items
  - Rime export preview snippet

Create `apps/web-dashboard/src/__tests__/controls.test.tsx` with a UI test that:

- renders `App`
- changes scenario from `normal-day` to `empty-history`
- asserts visible summary copy changes from a populated state to a `NO_DATA`-style explanation
- changes preset from `last-7-days` to `last-30-days`
- asserts the visible range label changes
- asserts the top control bar shows a current range summary
- asserts the top control bar shows the current page-level status hint

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web-dashboard/src/__tests__/data-client.test.ts apps/web-dashboard/src/__tests__/controls.test.tsx`
Expected: FAIL because config, client aggregation, loading state, preset switching, and scenario switching do not exist yet.

- [ ] **Step 3: Define app defaults and option metadata**

In `app-config.ts`, define:

- scenario options
- preset options
- default UI state

- [ ] **Step 4: Create a single dashboard client entry**

In `dashboard-client.ts`, implement one async loader that:

- creates the service registry
- loads dashboard bootstrap
- loads lexicon overview/list
- loads high-frequency-new lexicon items
- loads low-frequency-stale lexicon items
- loads a Rime export preview snippet
- returns a combined object for UI consumption

Keep all direct package calls here so page components stay clean.

- [ ] **Step 5: Add view-model mappers**

Implement mappers that:

- normalize labels
- compute current template and preview display
- keep raw contracts out of component props

- [ ] **Step 6: Wire global app state in `App.tsx`**

Add:

- `scenarioId`
- `preset`
- `hideTermsInReport`
- `forceMaskedContent`
- `activePage`
- `lexiconCategory`
- `loading`
- `error`

and trigger reloads when scenario/preset/report options change.

- [ ] **Step 7: Run the controls test to verify it passes**

Run: `npx vitest run apps/web-dashboard/src/__tests__/data-client.test.ts apps/web-dashboard/src/__tests__/controls.test.tsx`
Expected: PASS

- [ ] **Step 8: Commit**

Run:

```bash
git add apps/web-dashboard/src/lib apps/web-dashboard/src/App.tsx apps/web-dashboard/src/__tests__/controls.test.tsx apps/web-dashboard/src/__tests__/data-client.test.ts
git commit -m "feat: add web dashboard data layer"
```

## Task 3: Build App Shell, Navigation, And Global Controls

**Files:**
- Create: `apps/web-dashboard/src/components/app-shell.tsx`
- Create: `apps/web-dashboard/src/components/sidebar-nav.tsx`
- Create: `apps/web-dashboard/src/components/topbar-controls.tsx`
- Create: `apps/web-dashboard/src/components/state-badge.tsx`
- Create: `apps/web-dashboard/src/components/error-banner.tsx`
- Create: `apps/web-dashboard/src/components/empty-state-panel.tsx`
- Create: `apps/web-dashboard/src/components/section-card.tsx`
- Modify: `apps/web-dashboard/src/App.tsx`
- Modify: `apps/web-dashboard/src/styles/layout.css`
- Modify: `apps/web-dashboard/src/styles/theme.css`

- [ ] **Step 1: Write the failing shell/navigation test**

Extend `app.smoke.test.tsx` or create a dedicated assertion that expects:

- six navigation items
- a scenario selector
- a preset selector
- a visible active-page region

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web-dashboard/src/__tests__/app.smoke.test.tsx`
Expected: FAIL because the full shell does not exist yet.

- [ ] **Step 3: Build the reusable shell components**

Implement the app shell with:

- left sidebar on desktop
- top control bar
- main content region
- mobile fallback layout

- [ ] **Step 4: Add state badges and empty/error panels**

Ensure all page states can be shown consistently, including `NO_DATA`, `EMPTY_RESULT`, and `ERROR`.

- [ ] **Step 5: Apply the visual system**

Use the spec design tokens and `ui-ux-pro-max` guidance:

- no emoji icons
- clear borders
- hover feedback without scale shift
- strong contrast in light mode
- Fira typography

- [ ] **Step 6: Run the shell/navigation test to verify it passes**

Run: `npx vitest run apps/web-dashboard/src/__tests__/app.smoke.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

Run:

```bash
git add apps/web-dashboard/src/components apps/web-dashboard/src/App.tsx apps/web-dashboard/src/styles
git commit -m "feat: add web dashboard shell and controls"
```

## Task 4: Build Shared Visualization Components

**Files:**
- Create: `apps/web-dashboard/src/components/metric-grid.tsx`
- Create: `apps/web-dashboard/src/components/chart-card.tsx`
- Create: `apps/web-dashboard/src/components/simple-line-chart.tsx`
- Create: `apps/web-dashboard/src/components/simple-bar-chart.tsx`
- Create: `apps/web-dashboard/src/components/heatmap-grid.tsx`
- Create: `apps/web-dashboard/src/components/tag-cloud.tsx`
- Create: `apps/web-dashboard/src/components/lexicon-table.tsx`

- [ ] **Step 1: Write the failing visualization smoke test**

Add or extend a test that renders the shared components with fixture-like props and asserts:

- charts render titles and value labels
- heatmap grid renders cells
- lexicon table renders rows without crashing

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web-dashboard/src/__tests__/app.smoke.test.tsx`
Expected: FAIL because these shared visual components do not exist yet.

- [ ] **Step 3: Implement lightweight, dependency-conscious visual components**

Prefer:

- simple SVG or a lightweight chart wrapper
- horizontal-scroll-safe lexicon table
- weighted tag cloud instead of a complex freeform cloud

- [ ] **Step 4: Add accessibility affordances**

Ensure:

- chart regions have headings and descriptions
- heatmap has textual labels
- table uses semantic markup

- [ ] **Step 5: Run the visualization smoke test to verify it passes**

Run: `npx vitest run apps/web-dashboard/src/__tests__/app.smoke.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

Run:

```bash
git add apps/web-dashboard/src/components
git commit -m "feat: add dashboard visualization components"
```

## Task 5: Implement Overview, Stats, Vocabulary, And Time Pages

**Files:**
- Create: `apps/web-dashboard/src/pages/overview-page.tsx`
- Create: `apps/web-dashboard/src/pages/stats-page.tsx`
- Create: `apps/web-dashboard/src/pages/vocabulary-page.tsx`
- Create: `apps/web-dashboard/src/pages/time-page.tsx`
- Modify: `apps/web-dashboard/src/App.tsx`

- [ ] **Step 1: Write the failing main-page rendering test**

Create assertions that `normal-day` renders:

- overview KPI cards
- stats trend section
- vocabulary top term section
- time heatmap or hourly section

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web-dashboard/src/__tests__/app.smoke.test.tsx`
Expected: FAIL because the pages do not exist yet.

- [ ] **Step 3: Implement the four primary analytics pages**

Each page should:

- consume mapped props only
- render its own empty state when needed
- keep titles, subtitles, units, and cards explicit

- [ ] **Step 4: Wire page routing or tab switching**

Update `App.tsx` so the active navigation item controls which page component renders.

- [ ] **Step 5: Run the page rendering test to verify it passes**

Run: `npx vitest run apps/web-dashboard/src/__tests__/app.smoke.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

Run:

```bash
git add apps/web-dashboard/src/pages apps/web-dashboard/src/App.tsx apps/web-dashboard/src/__tests__/app.smoke.test.tsx
git commit -m "feat: add primary analytics pages"
```

## Task 6: Implement Lexicon And Report Pages

**Files:**
- Create: `apps/web-dashboard/src/pages/lexicon-page.tsx`
- Create: `apps/web-dashboard/src/pages/report-page.tsx`
- Create: `apps/web-dashboard/src/__tests__/report-options.test.tsx`
- Modify: `apps/web-dashboard/src/App.tsx`

- [ ] **Step 1: Write the failing lexicon/report test**

Add a test that:

- navigates to report
- toggles `hide terms` or `masked content`
- expects the report preview to update

Also assert the lexicon page shows an overview summary and at least one table row for `normal-day`.
Also assert that changing the lexicon category filter updates the visible row set or section state.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web-dashboard/src/__tests__/report-options.test.tsx`
Expected: FAIL because lexicon/report pages and option handling are incomplete.

- [ ] **Step 3: Implement the lexicon page**

Include:

- overview cards
- category filter
- read-only table
- high-frequency-new and low-frequency-stale highlights
- Rime export preview snippet

Wire `lexiconCategory` state so the filter is interactive and page-local behavior is testable.

- [ ] **Step 4: Implement the report page**

Include:

- template selector
- report summary
- section list
- text preview
- visibility labels for hidden terms and masking state

- [ ] **Step 5: Run the lexicon/report test to verify it passes**

Run: `npx vitest run apps/web-dashboard/src/__tests__/report-options.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

Run:

```bash
git add apps/web-dashboard/src/pages apps/web-dashboard/src/__tests__/report-options.test.tsx apps/web-dashboard/src/App.tsx
git commit -m "feat: add lexicon and report pages"
```

## Task 7: Add Empty-State Coverage, Docs, And Commands

**Files:**
- Create: `apps/web-dashboard/src/__tests__/empty-state.test.tsx`
- Create: `apps/web-dashboard/src/__tests__/accessibility.test.tsx`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/user-guide.md`
- Modify: `docs/developer-guide.md`
- Modify: `docs/demo/demo-playbook.md`
- Modify: `docs/testing/full-test-guide.md`

- [ ] **Step 1: Write the failing empty-state test**

Create assertions that `empty-history` renders:

- `NO_DATA` copy
- empty metric or placeholder blocks
- no crash when navigating across all six pages

Also include a second failing path that forces or mocks:

- `EMPTY_RESULT`
- `ERROR`

and asserts each state renders distinct explanatory copy.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web-dashboard/src/__tests__/empty-state.test.tsx`
Expected: FAIL because the empty-state handling across all pages is not complete yet.

- [ ] **Step 3: Write the failing accessibility test**

Create `apps/web-dashboard/src/__tests__/accessibility.test.tsx` with assertions that:

- keyboard focus can reach navigation and top controls
- interactive controls expose accessible names
- the error banner uses `role="alert"` or equivalent announced semantics

- [ ] **Step 4: Run the accessibility test to verify it fails**

Run: `npx vitest run apps/web-dashboard/src/__tests__/accessibility.test.tsx`
Expected: FAIL because focus handling and alert semantics are not fully wired yet.

- [ ] **Step 5: Complete empty and filtered-result handling**

Ensure the app cleanly renders:

- `NO_DATA`
- `EMPTY_RESULT`
- `ERROR`

without broken layout or missing explanatory text.

- [ ] **Step 6: Add accessibility semantics**

Ensure:

- nav and controls are keyboard reachable
- focus states are visible
- errors are announced with semantic alert behavior

- [ ] **Step 7: Add root scripts and docs**

Add scripts such as:

- `web`
- `web:build`
- `test:web`

Document:

- how to start the dashboard
- how to switch scenarios
- how to test the web app

- [ ] **Step 8: Run state and accessibility tests to verify they pass**

Run: `npx vitest run apps/web-dashboard/src/__tests__/empty-state.test.tsx apps/web-dashboard/src/__tests__/accessibility.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

Run:

```bash
git add package.json README.md docs/user-guide.md docs/developer-guide.md docs/demo/demo-playbook.md docs/testing/full-test-guide.md apps/web-dashboard/src/__tests__/empty-state.test.tsx apps/web-dashboard/src/__tests__/accessibility.test.tsx
git commit -m "docs: add web dashboard usage and test guidance"
```

## Task 8: Full Verification And Final Integration

**Files:**
- Modify: files from previous tasks as needed

- [ ] **Step 1: Run targeted web app tests**

Run: `npm run test:web`
Expected: PASS

- [ ] **Step 2: Run the existing full test suite**

Run: `npm test`
Expected: PASS with no regressions in the existing workspace test suite plus the new web tests.

- [ ] **Step 3: Run TypeScript build**

Run: `npm run build`
Expected: PASS for workspace TypeScript compilation.

- [ ] **Step 4: Run the web app build**

Run: `npm run web:build`
Expected: PASS and emit a production bundle for the dashboard app.

- [ ] **Step 5: Run the CLI regression gate**

Run: `npm run release:check`
Expected: PASS so the existing product path remains stable.

- [ ] **Step 6: Manually inspect the browser app**

Run: `npm run web`
Expected: local dashboard opens and the following are visually verified:

- scenario switching
- preset switching
- all six pages
- `NO_DATA`, `EMPTY_RESULT`, and `ERROR` states
- responsive behavior at 375px, 768px, 1024px, 1440px
- keyboard navigation and visible focus states
- reduced-motion friendly transitions

- [ ] **Step 7: Commit**

Run:

```bash
git add apps/web-dashboard package.json tsconfig.json vitest.config.ts README.md docs
git commit -m "feat: deliver web dashboard"
```
