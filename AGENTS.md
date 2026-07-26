# AGENTS.md

**Start here.** This is the coding contract for every agent and human working in
this repository. It is derived from [`docs/`](./docs/README.md) — the docs hold the
reasoning, this file holds the rules. Where they disagree, the docs win and this
file gets fixed.

---

## Start at the handoff

**Read [docs/18-HANDOFF.md](./docs/18-HANDOFF.md) before starting.** It records what
is actually built, the traps that only show up when you boot the stack, how a module
gets wired, and what is left. It supersedes every other doc on current state.

Short version: `auth`, `scraping`, `notifications`, `jobs` and `monitors` are built;
`auth` and `monitors` are mounted and verified over HTTP. The change-detection
pipeline (`modules/runs`) and the web features are the remaining work.

## 0. The rule that outranks the others

> **Every fix and every implementation updates the docs in the same change.**

Not a follow-up, not a ticket, not "later".

| You did this                               | Then you update                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| Behavior differs from what a doc says      | That doc                                                                 |
| Added an env var                           | `core/config` **and** [docs/11-ENVIRONMENT.md](./docs/11-ENVIRONMENT.md) |
| Added a route                              | [docs/09-API.md](./docs/09-API.md) + regenerate OpenAPI & client         |
| Added a table or column                    | [docs/02-DATA-MODEL.md](./docs/02-DATA-MODEL.md) + a migration           |
| Added a notification channel               | [docs/06-NOTIFICATIONS.md](./docs/06-NOTIFICATIONS.md) §4                |
| Added a constant category or lint rule     | [docs/03-BACKEND.md](./docs/03-BACKEND.md) §3                            |
| Changed a Phase-0 contract                 | An ADR in `docs/adr/NNN-*.md`, announced before merge                    |
| Learned something non-obvious the hard way | The relevant doc's "watch out" — with the _why_                          |

Docs are the interface between agents who never share a context window. A stale
doc is a broken build that nothing catches.

---

## 1. What this is

A self-hostable web scraping and change-monitoring platform. Users watch pages,
extract fields, decide when a change matters, and get notified through pluggable
channels. Read [docs/01-ARCHITECTURE.md](./docs/01-ARCHITECTURE.md) before writing
anything.

```
apps/api      Bun + Elysia HTTP server (composition root)
apps/worker   Bun + BullMQ consumers  (composition root)
apps/web      Vite + React SPA — landing page + management console
packages/core     domain · errors · constants · config · i18n · observability
packages/db       drizzle schema · migrations · repositories
packages/server   feature modules: auth · monitors · scraping · runs · notifications · jobs
packages/tooling  tsconfig · prettier presets
```

**Features are modules, not packages.** Do not create a new package. If your work
doesn't fit an existing module, create `packages/server/src/modules/<name>/`.

---

## 2. Before you write code

1. Read [docs/README.md](./docs/README.md) — index + locked decisions.
2. Read the doc for your layer: [03-BACKEND](./docs/03-BACKEND.md) or
   [04-FRONTEND](./docs/04-FRONTEND.md).
3. Find your stream in [12-AGENT-WORKSTREAMS](./docs/12-AGENT-WORKSTREAMS.md) and
   **check the ownership map**. Don't write outside your paths — request the change instead.
4. Check [15-DESIGN-SYSTEM](./docs/15-DESIGN-SYSTEM.md) if you touch UI, and
   [16-I18N](./docs/16-I18N.md) if you write any string a human will read.

---

## 3. Stack facts that are easy to get wrong

- Runtime is **Bun** for `api`/`worker`; the package manager is **pnpm**. Never run
  `bun install` — it writes a lockfile we don't use.
- **Effect 3.22 idioms**: `Effect.Service`, `Data.TaggedError`, `Effect.fn`, `Layer`,
  `ManagedRuntime`. Not the Effect v4 `effect/unstable/*` paths that appear in newer docs.
- **Effect Schema is the only schema language** — but route schemas must be wrapped:
  `Schema.standardSchemaV1(MySchema)`. A bare `Schema.Struct` lacks the `~standard`
  property Elysia looks for and is **silently ignored**: no error, no validation, and
  an empty schema in the OpenAPI document. Don't add Zod. Don't hand-write TypeBox.
- OpenAPI is `@elysiajs/openapi` with `provider: "swagger-ui"` (not `"swagger"`) and
  `mapJsonSchema: { effect: JSONSchema.make }`.
- Graceful shutdown needs `process.on("SIGTERM")`, which the `no-restricted-globals`
  rule forbids. Entry files use `globalThis.process` — the rule flags the bare
  identifier, not a property access. Do this only in `main.ts`.
- **Elysia requires method chaining.** Breaking the chain loses types.
- **The frontend API layer is generated.** `apps/web/src/api/generated/**` and
  `apps/api/openapi.json` are build outputs — regenerate, never edit. Import from
  `@/api`, **never** from `@/api/generated` directly: the barrel installs the error
  interceptor that maps the server envelope to `ApiError`, and a deep import bypasses
  it silently. Generated files carry a `@ts-nocheck` header on purpose
  ([04 §5](./docs/04-FRONTEND.md)).
- **shadcn components are copied in**, not imported. They're ours to theme.

---

## 3a. Code style — no comments

**Never write comments.** No inline comments, no TSDoc/JSDoc, no section banners, no
`// TODO`. This holds for every language and every file in the repo.

Names, types, and file structure carry the meaning. If code needs explaining, the
explanation belongs in the module's `README.md` or in `docs/` — where it is read,
reviewed, and kept current — not in a comment that rots next to the code.

When something is genuinely surprising: extract it into a well-named function, or
write it up in the module README with the reasoning. Both are better than a comment.

---

## 3b. Git

- **Logical feature commits.** Conventional style: `feat:`, `fix:`, `chore:`,
  `docs:`, `refactor:`, `test:`. One coherent unit of work per commit; never a dump
  of unrelated changes.
- **Never add a `Co-Authored-By` trailer** or any AI attribution to a commit message.
- Commit the docs change together with the code change it belongs to (§0).
- Branch per stream: `stream/<letter>-<name>`.

---

## 3c. Parallel work

Independent workstreams run as subagents, not serially. Before fanning out:

1. Land the blocking contract work first (`core` types, DB schema, workspace config).
2. Give each agent its **owning paths** from the map in
   [docs/12-AGENT-WORKSTREAMS.md](./docs/12-AGENT-WORKSTREAMS.md) and the docs it
   must follow.
3. Match the model to the work — cheaper tiers for mechanical scaffolding
   (configs, Dockerfiles, CRUD, boilerplate), stronger tiers for architecture,
   type-level Effect code, and design-sensitive UI.
4. Agents never edit outside their paths, and never touch generated files.

---

## 4. Backend rules

Full detail: [docs/03-BACKEND.md](./docs/03-BACKEND.md).

### Module shape

```
packages/server/src/modules/<name>/
  <name>.constants.ts  <name>.errors.ts   <name>.schema.ts
  <name>.repository.ts <name>.service.ts  <name>.routes.ts
  <name>.messages.ts   index.ts  README.md  *.test.ts
```

`index.ts` is the contract. Importing another module's internals is a lint error.

### Non-negotiables

- **No magic strings.** A literal that repeats or crosses a boundary is a constant
  in `core/constants`: `SERVICE_TAG`, `QUEUE`, `ERROR_CODE`, `CHANNEL_KIND`,
  `HEADER`, `COOKIE`, `ROUTE`, `API_TAG`, `REDIS_KEY`, `SPAN`, `METRIC`,
  `AUDIT_ACTION`. Same for magic numbers.
- **No hardcoded prose.** Tagged errors carry _data_, never sentences. The sentence
  is rendered from an i18n key at the edge, in the reader's locale.
- **No `process.env`** outside `core/config`. **No `Date.now()`/`Math.random()`** —
  use Effect `Clock`/`Random` so `TestClock` works.
- **Every service method** is wrapped in `Effect.fn(SPAN.x.y)`, returns a `const`
  object of functions, and declares a narrow, explicit error channel.
- **Every expected failure** is a `Data.TaggedError` mapped in the single exhaustive
  `Match` matcher. An unmapped tag must fail the build, not produce a 500.
- **Ownership is filtered in SQL**, in the service layer. Never load-then-check.
- **Repositories return domain types**, never Drizzle rows. No SQL outside them,
  no business rules inside them.
- **Routes are thin**: validate → authorize → one service call → shape response.
  Logic in a handler is a review-blocking defect.
- **Every route declares** `response` schemas for every status, a unique camelCase
  `operationId`, `tags`, and `detail.summary`. The generated client depends on all four.
- **Job handlers must be safe to run twice.** At-least-once delivery is the contract.
- **Secrets** never appear in a DTO, a log, or a stored payload preview.

---

## 5. Frontend rules

Full detail: [docs/04-FRONTEND.md](./docs/04-FRONTEND.md).

### Never use `useEffect`

Banned in feature code, enforced by ESLint. Instead:

| Want to…                  | Use                                   |
| ------------------------- | ------------------------------------- |
| Fetch                     | `useQuery` / route loader             |
| Poll                      | `refetchInterval`                     |
| Derive state              | Compute during render                 |
| Reset on prop change      | `key={id}`                            |
| React to an action        | The event handler                     |
| Read external state       | `useStore(store, selector)`           |
| Persist filters/selection | Router search params                  |
| Focus / measure / animate | `ref` callback, CSS, View Transitions |

The only place effects may live is `src/lib/browser/` — a small, reviewed, tested
set of primitives (`useIsMediaQuery`, `useIsOnline`, `useInterval`,
`useEventListener`, `useDocumentTitle`, `useHotkey`). Adding one needs justification
and a test.

### Atomic components

- **≤ 150 lines** per component. **≤ 7 props.**
- **A component either fetches or renders — never both.** Containers fetch;
  presentational components take props.
- **No god components.** The monitor editor is five files, not one.
- **No large state.** More than three related `useState` calls → `useReducer` or the
  URL. No TanStack Store over 7 keys → split it.
- **No prop drilling past two levels** → composition first, context only for ambient values.
- Layers: `components/ui` (atoms) → `molecules` → `organisms` → `features/*/containers`
  → `layouts` → `routes`.

### State has three homes, no overlap

Server data → TanStack Query. Filters/sort/selection/dialog ids → **URL search params**.
Ephemeral UI → TanStack Store.

### Strings and formatting

Every visible string is an i18next key — including `placeholder`, `title`,
`aria-label`, `alt`, toasts, empty states, validation. Dates and numbers go through
`lib/format` (Intl, user's locale + timezone). Never `toFixed`, never inline
`toLocaleString`, never a concatenated sentence.

### Always visible

App version + commit, and connection status (connected / reconnecting / offline).
On a version mismatch with `/health`, offer a reload. See
[docs/04-FRONTEND.md §8](./docs/04-FRONTEND.md).

---

## 6. Design

Follow [docs/15-DESIGN-SYSTEM.md](./docs/15-DESIGN-SYSTEM.md) exactly — it is a
specification, not a mood board.

- **Chrome is monochrome; content is chromatic.** Color only where it means
  something: status, change direction, channel identity, chart series, primary action.
- **Machine text is mono, human text is sans.** URLs, selectors, values, diffs,
  timestamps, IDs → Geist Mono. Everything else → Archivo.
- The **Pulse Strip** is the signature device. Use it; don't invent a second one.
- Never encode meaning in color alone — icon + word too.
- Every list has designed empty, loading (skeletons), and error states.
- Accessibility floor is CI-checked: contrast, focus rings, full keyboard operation,
  reduced motion, 200% text zoom, 40% label expansion.

---

## 7. Testing

Full detail: [docs/14-TESTING.md](./docs/14-TESTING.md).

- `@effect/vitest` (`it.effect`); stub **layers**, not mocks; `TestClock` for
  anything time-dependent.
- Scraping is tested with golden fixture files. Never hit a third-party site in a test.
- Presentational components test with no network at all.
- Integration via Testcontainers; each test in a rolled-back transaction.
- Coverage gates: ≥80% on `scraping`/`runs`/`notifications`, ≥60% elsewhere.
- Test that alerts **don't** fire when suppressed — as important as testing that they do.

---

## 8. Commands

Dev ports are the **9300 block** — `9300` API, `9301` web, `9302` Postgres,
`9303` Redis, `9304` browserless. Those are _host_ ports; inside the compose
network Postgres is still `5432`, Redis `6379`, browserless `3000`. Full table in
[docs/10-DEPLOYMENT.md §0](./docs/10-DEPLOYMENT.md).

```bash
pnpm dev            # infra via compose + api/worker/web with hot reload
pnpm typecheck      # tsc across the workspace
pnpm lint           # eslint incl. boundary, no-useEffect, no-literal-string rules
pnpm test           # unit + service tests
pnpm test:int       # integration (Testcontainers)
pnpm test:e2e       # Playwright against the composed stack
pnpm db:generate    # drizzle-kit generate after a schema change
pnpm db:migrate
pnpm db:reset       # drop, migrate, seed
pnpm gen:openapi    # apps/api → apps/api/openapi.json
pnpm gen:api        # openapi.json → apps/web/src/api/generated  (both committed)
pnpm gen:env        # regenerate deploy/.env.example from core/config
pnpm i18n:check     # every locale complete against `en`
pnpm i18n:types     # regenerate i18next key types
```

---

## 9. Definition of done — every change

- [ ] `pnpm typecheck && pnpm lint && pnpm test` green from the repo root
- [ ] `pnpm i18n:check` green; new strings keyed in `en` **and** `cs`
- [ ] `pnpm gen:openapi && pnpm gen:api` leaves no diff
- [ ] No `any`, no `process.env`, no `Date.now()`, no magic strings, no hardcoded
      prose, no `useEffect` outside `lib/browser`, no unmapped error tags
- [ ] Module/feature `README.md` current and documents every export — no comments in code
- [ ] Tests for logic; integration tests for anything touching Postgres/Redis
- [ ] **Docs updated** (§0)
- [ ] One line added at the marked insertion point in the composition root, if applicable

---

## 10. When the plan is wrong

It will be, somewhere. Fix the code **and** the doc in the same change. If the
change touches a Phase-0 contract others depend on (`core` types, the DB schema,
constants, the error taxonomy), write `docs/adr/NNN-<slug>.md` describing the
change and its blast radius, and announce it before merging.

Silent divergence between docs and code is the one failure mode this project is
structured to prevent. Don't be the one who introduces it.
