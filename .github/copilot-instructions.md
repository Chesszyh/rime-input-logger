# Copilot Instructions

## Project Context
Personal Input Analytics System (个人输入分析系统). A monorepo for analyzing input data from Rime/Fcitx5.

## Architecture & Boundaries
- **Monorepo Structure**:
  - `packages/contracts`: Single source of truth for types/interfaces. **No runtime dependencies allowed.**
  - `packages/mock-data`: Shared fixtures and test scenarios based on `contracts`.
  - `packages/analytics`: Core analysis engine (Agent B).
  - `packages/services`: Main logic for ingestion and governance.
  - `apps/demo`: Integration and entry point for demonstration.
- **Dependency Flow**: `contracts` <- `mock-data` <- `services` <- `apps/demo`.
- **Isolation**: Analytics and services must not depend on `apps/demo`.

## Development Workflow
- **Build**: `npm run build` (tsc based)
- **Test**: `npm test` (vitest based)
- **Demo**: `npm run demo` (tsx based)
- **Project Documentation**: Refer to `docs/` for detailed specs:
  - [Field Dictionary](docs/reference/field-dictionary.md): Naming rules and key fields.
  - [Module Dependency Map](docs/architecture/module-dependency-map.md): High-level architecture and agent hand-offs.

## Coding Conventions
- **Naming (per `field-dictionary.md`)**:
  - Timestamps: Use `At` suffix (e.g., `occurredAt`, `startedAt`), ISO 8601 strings.
  - Date keys: Use `dateKey`, format `YYYY-MM-DD`.
  - Page objects: Use `PageData` suffix.
  - States: Use enum literals instead of boolean combinations.
  - Text fields: Restricted to `rawText`, `maskedText`, `normalizedText`.
- **Imports**: Prefer relative imports within the same package.

## Agent Specifics (Current Focus: Agent B)
- Work on `packages/analytics/src/*`.
- Use `fixtureScenarios` from `mock-data` for testing.
- Map event flows to `StatsSnapshot` and `VocabularyInsight`.

## Strategic Links
- [Architecture Docs](docs/architecture/)
- [Contracts](packages/contracts/src/index.ts)
- [Naming Guide](docs/reference/field-dictionary.md)
