# Implementation Handoff

**Read this before starting work.** It records what is actually on disk, the traps
that cost real time, and what is left. Where it disagrees with another doc about
current state, this page is right.

Last verified **2026-08-01** at 0.8.0, workspace green: 0 lint, 0 typecheck, 602 tests, CI
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

1. **Remaining API operations.** `docs/09-API.md` specifies 58; 56 are served.
   Missing: only the two `/admin` routes — there is no admin module yet, and Bull
   Board brings its own auth and feature-flag story.
2. **The browser strategy does not work under Bun.** Playwright's WebSocket client
   waits for `node:http`'s `'upgrade'` event; Bun emits `'response'` for the 101, so
   `connectOverCDP` hangs until the 45s timeout. Every `engine: browser` run fails
   and auto-escalation produces a failed run rather than a rendered page. Proven both
   ways against the same browserless container — `modules/runs/README.md` §Traps.
   Two ways out: run the worker on Node, or drive browserless over its REST API
   instead of CDP. That is a decision to make, not a bug to fix. Screenshots can be
   stored and served today; they just cannot be captured.
3. **A rule with `deliveryMode: digest` and no `digestCron` still holds forever.**
   The per-rule cron now drains the bucket, but a rule that never set a cron has no
   owner to flush it. Either require a cron when the mode is digest, or fall back to
   a default schedule.
4. Deferred and worth knowing: `STORAGE_DRIVER=s3` cannot be configured from
   Portainer — 23 documented variables are absent from the compose
   `x-app-environment` anchor, listed in `deploy/portainer/STACK.md` §3a.

## 5. Verifying against a live stack

Not optional for anything touching the database or HTTP.

```bash
pnpm dev:infra                                  # postgres 9302, redis 9303, browser 9304
cd apps/api
APP_URL=http://localhost:9300 APP_ENV=development \
POSTGRES_HOST=localhost POSTGRES_PORT=9302 POSTGRES_PASSWORD=scraper \
REDIS_HOST=localhost REDIS_PORT=9303 \
ENCRYPTION_KEY=dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcyEh \
SESSION_SECRET=test-session-secret-value-000000 \
BROWSER_TOKEN=dev-browser-token \
  bun src/main.ts

curl -s localhost:9300/api/v1/health
```

The worker is the same environment plus `RUN_MIGRATIONS_ON_BOOT=false`, run as
`bun apps/worker/src/main.ts` from the repo root. With both up, `POST
/api/v1/monitors/:id/run` queues a job the worker picks up and turns into a row in
`runs` — that is integration checkpoint **I1**, and it passes.

`pnpm dev:down` tears it back down. A stale `pgdata` volume causes `password
authentication failed`, because Postgres only applies `POSTGRES_PASSWORD` when
initialising an empty data directory.

## 6. Definition of done, every time

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm gen:openapi && pnpm gen:api && pnpm gen:env
git diff --exit-code        # the gate CI runs
pnpm i18n:check
```

Conventions that are lint-enforced, not suggestions:

- **No comments in code.** Rationale goes in the module README — that is what the
  rule's message tells you to do.
- **No magic strings**, no `process.env` outside `core/config`, no `Date.now()` or
  `Math.random()` — use `AppConfig`, `Clock`, `Random`.
- **Authorization in the service, not the route.** Every method takes a `userId` and
  filters at the query level.
- **Never work around a failure**: no `eslint-disable`, no deleted tests, no
  `allowDefaultProject`. A new `.ts` outside a tsconfig `include` needs the tsconfig
  fixed, not the rule silenced.
- Commit messages go through commitlint; `chore(release): vX` passes, `release: vX`
  does not.
- A change inside this repo is committed and **pushed** here first, then the pointer
  is committed in `dev-workspace`. Two commits, that order.
