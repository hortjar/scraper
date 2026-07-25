# ADR 0001 — Toolchain versions and two deliberate version ceilings

**Date:** 2026-07-25
**Status:** Accepted
**Affects:** every package (Phase-0 contract)

## Context

The workspace was scaffolded against versions that were already behind. A sweep of
the registry showed most dependencies had moved, and two of them had moved past
what our tooling can actually consume.

## Decision

Upgrade everything to current, **except** two ceilings we hold deliberately.

### Ceiling 1 — TypeScript stays on 6.x, not 7.x

TypeScript 7.0.2 is the latest release: the Go-native compiler, roughly 8–12×
faster on full builds. We are **not** taking it.

TypeScript 7.0 ships without a stable programmatic compiler API — Microsoft
expects that in 7.1 — and `typescript-eslint` declined TS7 support on release day.
Its published peer range is explicit:

```
typescript-eslint@8.65.0  peerDependencies.typescript: ">=4.8.4 <6.1.0"
```

Our entire rule-enforcement strategy is **type-aware linting**: `no-unsafe-*`,
`switch-exhaustiveness-check`, `consistent-type-imports`, the import-boundary
zones, and the custom `local/no-comments` rule all run through
`projectService: true`. Losing type-aware linting to gain compile speed would
trade the thing that keeps the plan honest for a build we do not yet wait on.

**We are on `typescript@6.0.3`.** Revisit when `typescript-eslint` ships TS7
support against the 7.1 API. The documented interim workaround — running `tsc` on
7.x while `@typescript/typescript6` feeds the linter — is available if compile
time ever becomes the bottleneck, but it means two compilers in the tree, and we
do not need it at this size.

### Ceiling 2 — Vitest stays on 3.x on the backend, and 4.x on the web

```
@effect/vitest@0.30.0  peerDependencies.vitest: "^3.2.0"
```

`@effect/vitest` is how backend tests get `it.effect` and `TestClock`, which
[14-TESTING](../14-TESTING.md) leans on for every time-dependent rule. So
`packages/core`, `packages/db`, `apps/api`, and `apps/worker` are on `^3.2.7`.

This ADR originally said Vitest would be pinned to 3.x _everywhere, including
`apps/web`_, so one runner covered the repo. **That is not possible**, and the
attempt failed immediately:

```
vitest@3.2.7  dependencies.vite:  ^5.0.0 || ^6.0.0 || ^7.0.0-0
vitest@4.1.10 peerDependencies.vite: ^6.0.0 || ^7.0.0 || ^8.0.0
```

`apps/web` is on **Vite 8**. Vitest 3 caps at Vite 7, so pinning the web app to
Vitest 3 pulled a second Vite into the tree and `tsc` failed on
`vitest/config` — a Vite 7 `Plugin` is not assignable to a Vite 8 `PluginOption`
(rollup vs rolldown `PluginContextMeta`). Only Vitest 4 supports Vite 8.

The resolution is one major per side, chosen by what actually constrains each:

| Workspace                                                 | Vitest    | Constrained by              |
| --------------------------------------------------------- | --------- | --------------------------- |
| `packages/core`, `packages/db`, `apps/api`, `apps/worker` | `^3.2.7`  | `@effect/vitest` peer range |
| `apps/web`                                                | `^4.1.10` | Vite 8 support              |

This is not a compromise so much as an acknowledgement that the two halves have
different constraints. The backend packages have no Vite dependency at all, and
`apps/web` does not use `@effect/vitest`, so neither side wants what the other is
pinned to. The split costs nothing at the point of use: both are `vitest run`,
and no test file imports from the other side.

### Everything else moves

| Package                     | From  | To    | Note                         |
| --------------------------- | ----- | ----- | ---------------------------- |
| typescript                  | 5.7   | 6.0.3 | see ceiling 1                |
| eslint                      | 9     | 10    | v9 reaches EOL 2026-08-06    |
| @eslint/js                  | 9     | 10    |                              |
| typescript-eslint           | 8.20  | 8.65  | supports ESLint 10           |
| eslint-plugin-react-hooks   | 5     | 7     |                              |
| eslint-plugin-react-refresh | 0.4   | 0.5   |                              |
| eslint-plugin-import-x      | 4.6   | 4.17  |                              |
| globals                     | 15    | 17    |                              |
| @commitlint/*               | 19    | 21    | needs Node ≥22.12            |
| lint-staged                 | 15    | 17    | needs Node ≥22.22            |
| prettier                    | 3.4   | 3.9   |                              |
| @hey-api/openapi-ts         | 0.62  | 0.99  | accepts TS ≥6                |
| @effect/vitest              | 0.17  | 0.30  |                              |
| vitest (backend)            | 3.0   | 3.2.7 | see ceiling 2                |
| eslint-plugin-i18next       | 6.1.1 | 6.1.5 |                              |
| intl-messageformat          | 10    | 11    |                              |
| uuid                        | 11    | 14    | we already use named imports |
| @types/node                 | 22    | 26    |                              |
| @types/bun                  | 1.1   | 1.3   |                              |
| ioredis                     | 5.4   | 5.11  |                              |
| bullmq                      | 5.34  | 5.81  |                              |
| @elysiajs/cors              | 1.4.0 | 1.4.2 |                              |

Already current and unchanged: `effect@3.22`, `elysia@1.4.29`,
`drizzle-orm@0.45.2`, `drizzle-kit@0.31.10`, `postgres@3.4.9`, `vite@8.1.5`,
`react@19.2.8`.

## Why ESLint 10 is not optional

ESLint 9 is end-of-life on **2026-08-06**, roughly two weeks out. v10 removes the
legacy `.eslintrc` system entirely; we were already flat-config only, and every
plugin we use declares `eslint: ^10` support, so the migration costs us nothing.

## Consequences

- **Node ≥ 22.22** is now required by the toolchain (`lint-staged@17`). `.nvmrc`
  says 24; CI runs 24. Recorded in the root `engines` field.
- TypeScript 6 defaults (`strict`, `target: es2022`, `moduleResolution: bundler`)
  are already set explicitly in `@scraper/tooling/tsconfig/base.json`, so the
  defaults change is a no-op for us. We use none of the removed features
  (`out`, prepend projects, namespace module augmentation).
- Two ceilings mean two things to revisit. Both are recorded here rather than
  discovered later as mysterious pins.

### What the upgrade actually changed in the code

Six things broke or were revealed. None were cosmetic.

1. **`baseUrl` is deprecated in TS 6** (error `TS5101`, removed in 7).
   `apps/web/tsconfig.json` dropped it; `paths` resolves relative to the
   containing tsconfig when `baseUrl` is absent, so `@/*` still works.

2. **`.js` config files were never actually being linted.** With
   `projectService: true`, typescript-eslint now errors
   `was not found by the project service` for every file outside a tsconfig —
   the ESLint config itself, `commitlint.config.js`, and the presets that then
   lived in `packages/tooling/**/*.js`. They now get their own flat-config block with
   `projectService: false` and `disableTypeChecked`, because type-aware rules on
   plain ESM config files buy nothing.

3. **That immediately caught a real bug.** Once the (since-extracted) React config
   was linted, `no-dupe-keys` found `react-refresh/only-export-components`
   declared twice in one rules object — `"off"` shadowing the intended
   `["warn", { allowConstantExport: true }]`. The rule had silently never run.
   Turning it back on surfaced 30 warnings, which is why items 4 and 5 exist.

4. **`eslint-plugin-react-hooks` 7 added `react-hooks/refs`**, which correctly
   rejects writing a ref during render. `use-event-listener.ts` and
   `use-interval.ts` used the latest-ref pattern with a bare
   `latest.current = handler` in the render body. Both now sync inside a
   dependency-less effect, which keeps the subscription effect stable while
   staying legal.

5. **`react-refresh/only-export-components` needed two targeted exemptions and
   four real fixes.** Exempt: `src/routes/**` (a file route must export both
   `Route` and its component) and `src/components/ui/**` (shadcn re-exports Radix
   primitives, e.g. `export const Tooltip = TooltipPrimitive.Root`, which the
   plugin cannot recognize as components). Fixed properly: four molecules that
   exported a constant object or helper next to their component now put it in a
   sibling module — `ConnectionIndicator.constants.ts`, `DeltaBadge.constants.ts`,
   `StatusPill.constants.ts`, `AppVersion.skew.ts` — matching the `*.constants.ts`
   convention the backend already uses. The `components/molecules` barrel keeps
   the same public surface, so no consumer changed except one deep import.

6. **`pnpm lint` is now `eslint . --max-warnings 0`.** A warning nobody looks at
   is how item 3 survived. And `packages/db`, `apps/api`, `apps/worker` got
   `--passWithNoTests`, since Vitest exits 1 on an empty suite and those three
   have no tests until Phase 3 — that failure was breaking `pnpm -r test`
   independently of this upgrade.

### Known duplication, deliberately not fixed here

`MONITOR_STATUS` now exists twice: `packages/core/src/constants/domain-values.ts`
and `apps/web/src/components/molecules/StatusPill.constants.ts`. `apps/web` does
not depend on `@scraper/core`, and adding that dependency would pull `effect`
into the browser bundle. Nothing in the lint zones forbids it, so it is a genuine
open question — but resolving it belongs with the Hey API client work, not a
dependency bump.

## Verification

`pnpm -r typecheck`, `pnpm lint` (0 errors, 0 warnings), `pnpm -r test`
(49 tests), `pnpm --filter @scraper/web build`, `pnpm gen:env`, `pnpm i18n:check`,
and `pnpm --filter @scraper/api gen:openapi` (no drift). Both apps were booted
against live Postgres and Redis: `/health`, `/meta`, `/ready`, `/metrics`, and a
404 envelope in both `en` and `cs`; the worker registered 4 queues and drained
cleanly on `SIGTERM`.

## Revisit when

- `typescript-eslint` announces TypeScript 7 support → lift ceiling 1.
- `@effect/vitest` widens its peer range to Vitest 4 → lift ceiling 2.
