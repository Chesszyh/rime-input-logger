# Repository Guidelines

## Project Structure & Module Organization

This npm workspace contains the Personal Input Analytics System, a TypeScript project for Rime/Fcitx5 input analysis and local reporting.

- `apps/demo/`: command-line scenario runner.
- `apps/web-dashboard/`: React dashboard; components, pages, styles, and browser tests live under `src/`.
- `apps/rime-journal/`: command-line interface for real Rime journal data.
- `packages/`: shared `contracts`, `analytics`, `services`, `dashboard`, `mock-data`, and `rime-journal` modules. Update shared contracts when changing data shapes; keep analysis logic in packages rather than UI components.
- `rime/`: Lua collector and per-schema configuration example.
- `tests/`: integration and regression suites; reusable fixtures and expected outputs live in `tests/fixtures/`.
- `docs/`: developer, testing, and release guides. See `docs/rime-journal.md` for capture setup and verification.

## Build, Test, and Development Commands

Run commands from the repository root:

- `npm install`: install workspace dependencies.
- `npm run web`: start the Vite dashboard development server.
- `npm run demo` / `npm run demo:empty`: exercise normal and empty-history scenarios.
- `npm run build`: compile TypeScript into `dist/` with strict type checking.
- `npm run web:build`: build the browser dashboard.
- `npm test`: run all Vitest suites.
- `npm run test:web`: run dashboard tests only.
- `npm run test:agent-f`: run regression and snapshot suites.
- `npm run release:check`: run tests, both builds, and the normal-day demo before release work.

## Coding Style & Naming Conventions

Use TypeScript ES modules, two-space indentation, double-quoted strings, and semicolons. Follow neighboring code for trailing commas. Use camelCase for functions and variables, PascalCase for types and React components, and descriptive kebab-case module filenames such as `range-filter.ts`. No dedicated formatter or linter is configured. Comments should explain non-obvious reasons.

## Testing Guidelines

Use Vitest with `*.test.ts` for package tests and `*.test.tsx` in the dashboard's `src/__tests__/` directory. Browser tests use React Testing Library and jsdom. Add behavior-focused tests for changed analysis, filtering, exports, or UI states. Review fixture changes before accepting new baselines. No numeric coverage threshold is configured. Run `npm run test:rime` for capture and journal tests; this requires Lua 5.3 or 5.4.

## Commit & Pull Request Guidelines

Follow the history's concise prefixes: `feat:`, `fix:`, and `docs:`. Describe the final behavior in imperative form. Keep commits focused and preserve unrelated working-tree changes. Pull requests should explain the behavior change, list verification performed, link relevant issues, and include screenshots for visible dashboard changes.

## Public Release Workflow

Develop and publish in this repository on `master`; preserve its existing history. The project license is MIT. Keep collector code, schema examples, CLI commands, synthetic fixtures, and setup documentation reproducible from this repository alone.

Stage explicit paths after inspecting `git status` and the diff. Publish product code, tests, examples, and relevant documentation together. Keep real input logs, user databases, credentials, local configuration, reference checkouts, and private release records out of commits; use ignored local storage for private notes. Preserve unrelated working-tree changes.

Before pushing, run `npm run release:check`, review all outgoing commits and metadata, and scan for credentials and personal data. Review binary assets and third-party rights when included. Document actual capture separately from synthetic dashboard demonstrations.

Push only the intended branch to `origin`, using `git -c push.followTags=false push origin HEAD:refs/heads/master`. Verify the remote commit and any CI result. Tags and GitHub Releases require their own requested scope. Do not rewrite published history or change visibility without explicit authorization; existing authorization need not be requested again.
