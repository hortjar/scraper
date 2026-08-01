# Implementation Handoff

**Read this before starting work.** It records what is actually on disk, the traps
that cost real time, and what is left. Where it disagrees with another doc about
current state, this page is right.

Last verified **2026-08-01** at 0.8.0, workspace green: 0 lint, 0 typecheck, 618 tests, CI
passing on `main`.

## 1. What exists

| Area                                        | State                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `packages/core`, `packages/db`              | ✅ contracts, schema, migrations, boot-time migrator                      |
| `packages/server/src/modules/auth`          | ✅ built, **mounted**, verified over HTTP against a live stack            |
| `packages/server/src/modules/scraping`      | ✅ strategies, extraction, transforms, robots, SSRF guard                 |
| `packages/server/src/modules/notifications` | ✅ 5 channels, encryption, templates, dispatcher                          |
| `packages/server/src/modules/jobs`          | ✅ queues, schedulers, rate limits, maintenance, worker liveness          |
| `packages/server/src/modules/monitors`      | ✅ built, **mounted**, CRUD verified over HTTP                            |
| `packages/server/src/modules/runs`          | ✅ built, mounted, verified end to end against a live stack               |
| Notification channel routes                 | ✅ built, mounted, CRUD + test verified over HTTP                         |
| Notification rule routes                    | ✅ built, mounted, CRUD + ownership verified over HTTP                    |
| Delivery routes                             | ✅ list with filters and retry, verified over HTTP                        |
| Notify worker                               | ✅ real dispatcher; a change now reaches the channel, verified end to end |
| `apps/web/src/features/auth`                | ✅ login, register, password reset, profile, password, sessions, API keys |
| `apps/web/src/features/monitors`            | ✅ list, create, edit, detail, delete, run now                            |
| `apps/web/src/features/runs`                | ✅ runs and changes panels, run detail, diff renderer                     |
| `apps/web` channels feature                 | ✅ list, editor from kind descriptors, deliveries feed, per-monitor rules |

The API serves **40 paths** / 52 operations: `/health`, `/ready`, `/metrics`, `/meta`,
13 under `/auth`, 13 under `/monitors` (CRUD plus preview, enable, disable, duplicate
and extractor CRUD), 3 more under `/monitors` for runs and changes, 3 under `/runs`
(detail, diff, snapshot), a cross-monitor `/changes` feed, 4 under `/channels`, 2 for
notification rules, and 2 for deliveries.

### Auth is finished

Both modes work. `AUTH_MODE=local` (default) owns users; `AUTH_MODE=universal`
verifies `admin-app` RS256 tokens against its JWKS and disables local registration
and password login with a typed `LocalAuthDisabled` (403).

Verified end to end over HTTP: register, login, `/me`, API-key auth, session-only
routes rejecting API keys, key revocation, logout, session listing, admin bootstrap,
and identical responses for wrong-password vs unknown-user.

The universal client is **vendored** into `modules/auth/universal/` from
`admin-app`'s unpublished `@universal-admin/auth-client@0.2.0`. If that package is
ever published, delete that directory.

**Still needs you:** register `scraper` as an app in `admin-app` with its roles, or
every `aud` check fails in universal mode.

## 2. Traps that cost real time

Each of these typechecked and passed unit tests. Only booting the stack found them.
**Run the API against real Postgres and Redis before believing a feature works** —
see §5.

| Trap                                                                                                   | Documented in                             |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `ReservedSql` has no `.begin()`, so transactions must run on the pool                                  | `packages/db/README.md`                   |
| A `Date` in a postgres.js tagged template throws under Bun; use `sqlTimestamp()`                       | `modules/auth/README.md`                  |
| API-key secrets are base64url and contain `_`, so never `String.split` them                            | `modules/auth/README.md`                  |
| `Schema.Int` emits `$ref: #/$defs/Int`, which Elysia drops and the client crashes on                   | use `Schema.Number.pipe(Schema.int(), …)` |
| A pre-existing schema must be baselined, not re-migrated, or boot exits and you 502                    | `packages/db/README.md`                   |
| Advisory lock and unlock must share one session, or later replicas block forever                       | `packages/db/README.md`                   |
| Routes go on `createApiRoutes`, never `createApp`, which double-prefixes the paths                     | `docs/09-API.md`                          |
| A bare `Schema.Struct` response is silently ignored; wrap in `standardSchemaV1(…)`                     | `docs/09-API.md` §3                       |
| Compose interpolates unset vars to `""`, so use `blankToUndefined`, never `??`                         | `packages/core/README.md`                 |
| A config key with no default must also be added to compose's `x-app-environment`                       | `docs/17-DEPLOY-RUNBOOK.md`               |
| BullMQ's `prefix` must be set on **workers** too, or no job is ever picked up                          | `modules/runs/README.md`                  |
| A `Date` in a raw drizzle `sql` template throws under Bun; cast in the SQL, not the parameter          | `modules/runs/README.md`                  |
| `ON CONFLICT` on nullable columns needs `UNIQUE NULLS NOT DISTINCT`                                    | `modules/runs/README.md`                  |
| Assigning a full HTML document to `innerHTML` corrupts linkedom's node list                            | `modules/scraping/dom.types.ts`           |
| `Schema.partial` throws at runtime on a struct using `optionalWith(…, { default })`                    | `monitors.schema.ts`                      |
| A queue with a stub handler looks identical to a queue that works — check the handler, not the enqueue | `jobs/handlers/notify-runner.service.ts`  |
| `sql.unsafe` returns `timestamptz` as a **string**, so `DateFromSelf` decoding fails                   | `channel.repository.rows.ts`              |
| A helper typed as a narrow `Pick` but handed the whole row silently reverts every other field          | `channel.repository.rows.ts`              |
| An unqualified `SELECT` column list breaks the moment the query gains a `JOIN`                         | `delivery.repository.ts`                  |
| `errors.internalError` needs `{requestId}`; omitting it made intl throw and masked every 500           | `modules/auth/auth.http.ts`               |

## 3. How a module is wired

Four steps, all required, and the last is the one people forget.

1. Build the module under `packages/server/src/modules/<name>/` per
   `packages/server/README.md`.
2. Export a `<Name>Layer` from its `index.ts` and add the subpath to
   `packages/server/package.json` `exports`.
3. Merge the layer into `AppLayer` in `apps/api/src/runtime.ts`.
4. `.use(<name>Routes({ runtime, config }))` on **`createApiRoutes`** in
   `apps/api/src/app.ts`, then `pnpm gen:openapi && pnpm gen:api` and commit both.
   CI's `verify-generated` fails on drift.

`authBase` is generic over the runtime's services (`AuthPluginOptions<R>`), so a
module's routes can run effects needing its own services through `runAuthFx` without
auth knowing about them. Declare `export type XServices = X` and pass it:
`authBase<XServices>(options, PLUGIN.handlers)`. See
`modules/monitors/monitors.routes.ts` for the worked example.

## 4. What is left

1. **All 58 operations in `docs/09-API.md` are served.**
2. **Deferred and worth knowing:** `STORAGE_DRIVER=s3` cannot be configured from
