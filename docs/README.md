# Scraper — Documentation Index

A self-hostable web scraping & change-monitoring platform. Users register scrape
targets, declare what to extract, define when a change is worth knowing about,
and get notified through pluggable channels.

## Read in this order

| #   | Doc                                                | What it answers                                                   |
| --- | -------------------------------------------------- | ----------------------------------------------------------------- |
| 00  | [Implementation Plan](./00-IMPLEMENTATION-PLAN.md) | Phases, milestones, what ships when                               |
| 01  | [Architecture](./01-ARCHITECTURE.md)               | Processes, packages, modules, data flow                           |
| 02  | [Data Model](./02-DATA-MODEL.md)                   | Every table, column, index, and why                               |
| 03  | [Backend Conventions](./03-BACKEND.md)             | Effect/Elysia idioms, constants, errors, modules                  |
| 04  | [Frontend Conventions](./04-FRONTEND.md)           | Atomic components, no-`useEffect`, state, generated client        |
| 05  | [Scraping Engine](./05-SCRAPING.md)                | Strategies, extraction, transforms, diffing, ethics               |
| 06  | [Notifications](./06-NOTIFICATIONS.md)             | Channel contract, registry, adding a channel                      |
| 07  | [Scheduling & Jobs](./07-SCHEDULING.md)            | BullMQ topology, retries, rate limits, idempotency                |
| 08  | [Auth](./08-AUTH.md)                               | Effect-native sessions, password policy, API keys                 |
| 09  | [API Contract](./09-API.md)                        | Routes, Swagger, OpenAPI → generated client                       |
| 10  | [Deployment](./10-DEPLOYMENT.md)                   | Docker images, compose, Portainer stack, ops                      |
| 11  | [Environment Variables](./11-ENVIRONMENT.md)       | Every env var, default, and owner                                 |
| 12  | [Agent Workstreams](./12-AGENT-WORKSTREAMS.md)     | Parallelization, ownership, briefs, the docs rule                 |
| 13  | [Product Backlog](./13-PRODUCT-BACKLOG.md)         | Researched use cases, prioritized                                 |
| 14  | [Testing Strategy](./14-TESTING.md)                | What gets tested at which layer                                   |
| 15  | [Design System](./15-DESIGN-SYSTEM.md)             | Color, type, the signature device, landing page                   |
| 16  | [Internationalization](./16-I18N.md)               | Translation architecture, both sides                              |
| 17  | [Deploy Runbook](./17-DEPLOY-RUNBOOK.md)           | The commands, in order, for shipping a version                    |
| —   | [REACT.md](./REACT.md)                             | Pre-existing React guide (see 04 for deltas)                      |
| —   | [adr/](./adr/)                                     | Decision log — why a version is pinned, why a design was rejected |

Agents start at [AGENTS.md](../AGENTS.md) in the repo root.

## Locked decisions

| Decision        | Choice                                                                   | Rationale                                                                                                                             |
| --------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime         | **Bun** for `api` + `worker`                                             | Elysia's native target. pnpm still owns the workspace.                                                                                |
| Package manager | **pnpm workspaces**                                                      | Required. Bun is the runtime only, never the installer.                                                                               |
| Workspace shape | **4 packages, 3 apps**                                                   | `core` · `db` · `server` · `tooling`. Features are _modules_ inside `server`, not packages — same isolation, a tenth of the ceremony. |
| HTTP framework  | **Elysia 1.4**                                                           | Native Standard Schema support, first-class OpenAPI.                                                                                  |
| Effect system   | **Effect 3.22**                                                          | Services/Layers for DI, typed errors, Schema, retry/scheduling.                                                                       |
| Schema language | **Effect Schema everywhere**                                             | Accepted by Elysia via Standard Schema; OpenAPI via `mapJsonSchema`.                                                                  |
| API docs        | **Swagger UI** at `/api/v1/docs`                                         | `provider: "swagger-ui"`. OpenAPI **3.0.3** at `/api/v1/docs/json` — that is what `@elysiajs/openapi` emits; no Scalar mount.         |
| API client      | **Hey API** (`@hey-api/openapi-ts`)                                      | Generates types, SDK, and TanStack Query options from OpenAPI. Committed and drift-checked in CI.                                     |
| ORM             | **Drizzle 0.45** + Postgres 17                                           | SQL-first, typed, reviewable migrations.                                                                                              |
| Queue           | **BullMQ 5** on Redis 7                                                  | Job Schedulers, retries/backoff, rate limiting, concurrency.                                                                          |
| Scrape engine   | **Pluggable**: fetch+Cheerio, Playwright                                 | Strategy per target, auto-escalation.                                                                                                 |
| Auth            | **Custom, Effect-native**                                                | Argon2id + opaque session tokens.                                                                                                     |
| Frontend        | Vite 8 · React 19 · TanStack Query/Store/Router · shadcn/ui · Tailwind 4 | Per requirements.                                                                                                                     |
| i18n            | **`en` + `cs`**, ICU                                                     | Backend catalogs in `core`, frontend via `react-i18next`. No literal strings anywhere.                                                |
| Deploy          | Docker images + Compose on Portainer                                     | Everything configured through env vars.                                                                                               |

## Rules that apply everywhere

- **Modular by feature, not by layer.** A module owns its schema, service, routes, tests, docs.
- **No magic strings.** Anything repeated or crossing a boundary is a constant ([03 §3](./03-BACKEND.md)).
- **No hardcoded prose.** Every user-facing string is an i18n key ([16](./16-I18N.md)).
- **No `useEffect`** outside the blessed `lib/browser` primitives ([04 §4](./04-FRONTEND.md)).
- **Atomic components.** One job each, ≤150 lines, fetch _or_ render — never both.
- **Effect at the core, plain TS at the edges.** `ManagedRuntime` is the only bridge.
- **No env access outside `core/config`.** `process.env` appears in one place.
- **Every change updates the docs it invalidates** ([12 §7](./12-AGENT-WORKSTREAMS.md)).
