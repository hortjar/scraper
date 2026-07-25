# Implementation Plan

Five phases. Phase 0 is serial and non-negotiable — it freezes the contracts that
let Phases 1–2 run wide in parallel. Ownership and per-stream briefs live in
[12-AGENT-WORKSTREAMS](./12-AGENT-WORKSTREAMS.md).

Effort is in **agent-sessions** (one focused session ≈ half a day of human work).

---

## Phase 0 — Foundation & contract freeze · serial · ~5 sessions

Nothing else starts until this is merged. One agent, one branch.

### 0.1 Workspace
- [ ] `pnpm-workspace.yaml` (`apps/*`, `packages/*`), root scripts
- [ ] `@scraper/tooling`: tsconfig presets (`base`, `bun`, `react`), ESLint, Prettier —
      one package, not three
- [ ] Strict TS everywhere: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- [ ] Lint rules that encode this plan's hard rules:
      import boundaries ([01 §3](./01-ARCHITECTURE.md)), no `useEffect` outside
      `lib/browser` ([04 §4](./04-FRONTEND.md)), no literal JSX strings
      ([16 §6](./16-I18N.md)), no `process.env` outside `core/config`
- [ ] Husky + lint-staged, commitlint, `.editorconfig`, `.nvmrc`, `packageManager` pin

### 0.2 `@scraper/core`
- [ ] **Constants** — every file listed in [03 §3](./03-BACKEND.md), populated as far
      as v1 is known: `SERVICE_TAG`, `QUEUE`, `ERROR_CODE`, `CHANNEL_KIND`, `HEADER`,
      `COOKIE`, `ROUTE`, `API_TAG`, `REDIS_KEY`, `SPAN`, `METRIC`, `AUDIT_ACTION`
- [ ] **Config** — every env var from [11-ENVIRONMENT](./11-ENVIRONMENT.md) as an
      Effect `Config`; secrets `Config.redacted`; fail-fast listing *all* problems;
      `pnpm gen:env` emits `.env.example`
- [ ] **Domain** — branded IDs, Effect Schema models for every entity in
      [02-DATA-MODEL](./02-DATA-MODEL.md), value objects (`NormalizedUrl`, `Money`,
      `CronExpression`), the full tagged-error taxonomy
- [ ] **i18n** — `Translator` service, `MSG` key tree, ICU catalogs for `en` + `cs`,
      locale resolution, `pnpm i18n:check` / `pnpm i18n:types`
- [ ] **Observability** — JSON logger with redaction, `FiberRef` annotations, OTel
      layer (no-op unless configured), `Metric` helpers, the `effectPlugin` bridge
      and the exhaustive `toHttpError` matcher

### 0.3 `@scraper/db`
- [ ] Drizzle schema for the **complete** v1 model, one file per feature area
- [ ] Initial migration: tables, partitions, indexes, check constraints, `monitor_stats`
- [ ] `Database` service (pooled), transaction propagation via `FiberRef`, health probe
- [ ] Repository base: row↔domain mappers, tagged errors for constraint violations
- [ ] Seed script + `pnpm db:reset`

### 0.4 App skeletons
- [ ] `apps/api`: boots, `/health` (with version), `/ready`, `/metrics`, `/meta`,
      Swagger UI at `/docs`, OpenAPI at `/docs/json`, graceful shutdown
- [ ] `apps/worker`: boots, Redis connected, empty queue set registered, graceful shutdown
- [ ] `apps/web`: Vite, React 19, Tailwind 4 with the design tokens from
      [15-DESIGN-SYSTEM](./15-DESIGN-SYSTEM.md), fonts self-hosted, i18next wired,
      TanStack Router + Query providers, a placeholder landing route and console shell
- [ ] **API pipeline**: `pnpm gen:openapi` → `apps/api/openapi.json` → `pnpm gen:api`
      → `apps/web/src/api/generated`. Both committed; CI fails on drift.

### 0.5 Infra & CI
- [ ] `deploy/`: Dockerfiles ×3, `docker-compose.dev.yml` (postgres, redis, browser),
      production compose, `.env.example`
- [ ] CI: install → typecheck → lint → i18n:check → gen drift check → test → build → docker build

### 0.6 Spikes (timeboxed; results written back into these docs)
- [x] **S1 — resolved, succeeded.** Effect Schema flows through Elysia into a real
      OpenAPI 3.0.3 document, verified by booting the API and generating
      `apps/api/openapi.json`. **Required detail:** wrap every route schema in
      `Schema.standardSchemaV1(...)` — a bare `Schema.Struct` is silently ignored.
      `provider` is `"swagger-ui"`, not `"swagger"`. TypeBox fallback not needed.
- [ ] **S2** Bun + Playwright over CDP to the `browser` container.
- [ ] **S3** BullMQ Job Schedulers under Bun: cron accuracy, timezone, `upsertJobScheduler` idempotency.

**Exit criteria:** `pnpm dev` brings the whole stack up; `pnpm test` green; a Phase-1
agent can import `MonitorId`, `MonitorNotFound`, `QUEUE`, and `MSG` from `@scraper/core`
against a database that already has every table.

---

## Phase 1 — Vertical capabilities · parallel × 6 · ~3–5 sessions each

| Stream | Owns | Ships |
|---|---|---|
| **A · Auth** | `server/modules/auth`, `web/features/auth`, `web/routes/_auth` | Register, verify, login, logout, reset, sessions, API keys, `requireUser` macro |
| **B · Monitors** | `server/modules/monitors` | Monitor + extractor CRUD, URL/SSRF guard, schedule validation, ownership, pagination |
| **C · Scraping** | `server/modules/scraping` | Strategy interface, `http` + `browser`, extraction, transforms, normalization, `previewScrape`, robots |
| **D · Notifications** | `server/modules/notifications` | Channel contract + registry, `email` + `webhook`, encryption, templates, dispatcher, channel routes |
| **E · Jobs** | `server/modules/jobs`, `apps/worker` | Queues, producer, schedulers, rate limits, maintenance jobs, worker bootstrap |
| **F · Web shell** | `web/components`, `web/lib`, `web/stores`, `web/i18n` | Design system in code, layouts, common components incl. `PulseStrip`, API client config, i18n, version + connection indicators |

**Integration checkpoint I1** (serial, ~1 session): compose modules in
`apps/api/src/app.ts` and `apps/worker/src/main.ts`; regenerate OpenAPI + client;
first end-to-end "create monitor → scheduled run → row in `runs`".

---

## Phase 2 — The product · parallel × 6 · ~3–4 sessions each

| Stream | Owns | Ships |
|---|---|---|
| **G · Change detection** | `server/modules/runs` | The 14-step run pipeline, diffing, change persistence, all 11 rule triggers, throttle/quiet-hours/digest/dedupe |
| **H · Monitor UI** | `web/features/monitors` | List with pulse strips, create/edit composed of five sub-forms, live preview, tags, search |
| **I · Runs UI** | `web/features/runs` | Run timeline, diff viewer, value charts, screenshots, manual run, failure drill-down |
| **J · Channels** | `server/modules/notifications/channels`, `web/features/channels` | `slack`/`discord`/`telegram` adapters, registry-driven channel UI, template editor |
| **K · Scheduling polish** | `server/modules/jobs` (digest, limits, health) | Digest builder, quiet-hours queueing, per-domain limits, auto-pause, health scoring |
| **L · Landing page** | `web/routes/index.tsx`, `web/landing` | The marketing page from [15 §7](./15-DESIGN-SYSTEM.md): animated hero diff, live pulse strip, sections, both locales, performance budget |

**Integration checkpoint I2**: create a monitor against a local fixture site, change
the fixture, receive a Discord + email alert with a correct diff — and a
below-threshold change that correctly sends nothing and records why.

---

## Phase 3 — Hardening · parallel × 4 · ~2–3 sessions each

| Stream | Ships |
|---|---|
| **M · Testing** | ≥80% on `scraping`/`runs`/`notifications`, Testcontainers integration, Playwright E2E golden paths |
| **N · Security** | SSRF hardening, rate limits, cookie/CSP headers, secret rotation tooling, dependency audit, review pass |
| **O · Ops** | Production compose, Portainer stack + guide, backups & restore rehearsal, Grafana dashboard, runbooks |
| **P · Docs & i18n completeness** | Module READMEs, OpenAPI polish, user guide, full `cs` catalog, pseudo-locale audit, ADR log |

---

## Phase 4 — Post-v1

Prioritized in [13-PRODUCT-BACKLOG](./13-PRODUCT-BACKLOG.md): visual selector,
screenshot diffing, monitor templates, browser login steps, RSS output, then
LLM-assisted selectors and change summaries.

---

## Milestones

| Milestone | Definition of done |
|---|---|
| **M1 — Skeleton** | Phase 0 merged; stack boots via compose; CI green; client generates from OpenAPI |
| **M2 — Alive** | I1 passed; a scheduled scrape writes runs and field values |
| **M3 — Useful** | I2 passed; change → rule → notification across email, webhook, Discord |
| **M4 — Shippable** | Phase 3 done; deployed to Portainer from a tagged image; restore rehearsed; landing page live |

## Risk register

| Risk | Mitigation |
|---|---|
| Effect Schema → OpenAPI → Hey API produces a poor client | Spike S1 before anything depends on it; TypeBox fallback documented |
| Playwright resource cost under load | Separate `browser` container, concurrency caps, `auto` prefers HTTP, hard timeouts |
| Alert storms / notification fatigue | Throttle, digest, quiet hours designed into the Phase-0 schema |
| Selector rot causing false alerts | `required` extractors fail the run instead of reporting a change |
| Merge conflicts across agents | Module boundaries + Phase-0 freeze + append-only composition root |
| Docs drifting from code | Every stream's DoD includes doc updates; CI checks generated artifacts |
| Legal/ToS exposure | robots.txt honored, per-domain limits, no evasion, documented operator responsibility |
