# Implementation Handoff

**Read this before starting work.** It records what is actually on disk, the traps
that cost real time, and what is left. Where it disagrees with another doc about
current state, this page is right.

Last verified **2026-07-26**, workspace green: 0 lint, 0 typecheck, 432 tests, CI
passing on `main`.

## 1. What exists

| Area                                        | State                                                            |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `packages/core`, `packages/db`              | ✅ contracts, schema, migrations, boot-time migrator             |
| `packages/server/src/modules/auth`          | ✅ built, **mounted**, verified over HTTP against a live stack   |
| `packages/server/src/modules/scraping`      | ✅ strategies, extraction, transforms, robots, SSRF guard        |
| `packages/server/src/modules/notifications` | ✅ 5 channels, encryption, templates, dispatcher                 |
| `packages/server/src/modules/jobs`          | ✅ queues, schedulers, rate limits, maintenance, worker liveness |
| `packages/server/src/modules/monitors`      | ✅ built, **mounted**, CRUD verified over HTTP                   |
| `packages/server/src/modules/runs`          | ❌ **not started** — see §4                                      |
| Notification channel routes                 | ❌ services exist, no HTTP surface                               |
| `apps/web` features                         | ❌ not started; shell, design system and generated client ready  |

The API serves **19 paths**: `/health`, `/ready`, `/metrics`, `/meta`, 13 under
`/auth`, and 5 under `/monitors`.

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

| Trap                                                                                 | Documented in                             |
| ------------------------------------------------------------------------------------ | ----------------------------------------- |
| `ReservedSql` has no `.begin()`, so transactions must run on the pool                | `packages/db/README.md`                   |
| A `Date` in a postgres.js tagged template throws under Bun; use `sqlTimestamp()`     | `modules/auth/README.md`                  |
| API-key secrets are base64url and contain `_`, so never `String.split` them          | `modules/auth/README.md`                  |
| `Schema.Int` emits `$ref: #/$defs/Int`, which Elysia drops and the client crashes on | use `Schema.Number.pipe(Schema.int(), …)` |
| A pre-existing schema must be baselined, not re-migrated, or boot exits and you 502  | `packages/db/README.md`                   |
| Advisory lock and unlock must share one session, or later replicas block forever     | `packages/db/README.md`                   |
| Routes go on `createApiRoutes`, never `createApp`, which double-prefixes the paths   | `docs/09-API.md`                          |
| A bare `Schema.Struct` response is silently ignored; wrap in `standardSchemaV1(…)`   | `docs/09-API.md` §3                       |
| Compose interpolates unset vars to `""`, so use `blankToUndefined`, never `??`       | `packages/core/README.md`                 |
| A config key with no default must also be added to compose's `x-app-environment`     | `docs/17-DEPLOY-RUNBOOK.md`               |

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

1. **`modules/runs` — the change-detection pipeline.** Phase 2 stream G, the largest
   remaining piece and the one that makes the product work: the 14-step run pipeline
   from [05-SCRAPING](./05-SCRAPING.md) and [07-SCHEDULING](./07-SCHEDULING.md),
   diffing, change persistence, the 11 rule triggers, throttle, quiet hours, digest
   and dedupe. The jobs module already defines the injectable `ScrapeRunner` and
   `NotifyRunner` interfaces it must implement — that is the seam to build against.
2. **Notification channel routes.** Services, registry and adapters are done; there
   is no channel CRUD over HTTP yet.
3. **Web features** — `web/features/auth`, `monitors`, `runs`, `channels`. The design
   system, layouts, router and generated client are all in place.
4. **Integration checkpoint I1**: create a monitor, watch a scheduled run write a row
   in `runs`.
5. Deferred and worth knowing: `STORAGE_DRIVER=s3` cannot be configured from
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
