# Auth — Implementation Handoff

**Status: built, not mounted.** `packages/server/src/modules/auth` exists and is
tested. Its routes are exported but **nothing composes them**, so the API does not
serve them yet. See §4.

This is a handoff, not a design doc. The design is
[08-AUTH](./08-AUTH.md); this page records what is actually on disk as of
**2026-07-26**, the decisions already made, and the traps found the hard way.
Read it before touching anything.

## 1. The decision

Build **the full scope of [08-AUTH](./08-AUTH.md)** — local sessions, registration,
password policy, API keys, verification tokens, rate limiting — **and** support
delegating identity to `admin-app`, the workspace identity provider.

That means an `AUTH_MODE` switch, matching the rest of the workspace:

| `AUTH_MODE`       | Behaviour                                                              |
| ----------------- | ---------------------------------------------------------------------- |
| `local` (default) | Scraper owns users, hashes passwords, issues its own sessions          |
| `universal`       | Identity delegated to `admin-app`; access tokens verified against JWKS |

Both are required. A self-hosted scraper must run standalone for someone who does
not also want to run an identity provider — that is the whole reason the switch
exists in `file-sync` and `checklists`. See
[dev-workspace docs/07-AUTH.md](../../../docs/07-AUTH.md) for the shared model.

## 2. What exists today

| Thing                                   | State                                                       |
| --------------------------------------- | ----------------------------------------------------------- |
| `packages/server`                       | ✅ exists, four modules, 328 tests, lint clean              |
| `modules/auth`                          | ✅ hashing, sessions, API keys, tokens, audit, RL           |
| `modules/auth/universal`                | ✅ JWKS verification, vendored (§3.3)                       |
| `modules/scraping`                      | ✅ strategies, extraction, transforms, UrlGuard             |
| `modules/notifications`                 | ✅ 5 channels, encryption, templates, dispatcher            |
| `modules/jobs`                          | ✅ queues, schedulers, rate limits, maintenance             |
| Boot-time migrations                    | ✅ resolved, see §3.1                                       |
| `modules/monitors`                      | ❌ **not started**                                          |
| `modules/runs`                          | ❌ **not started** (the change-detection pipeline)          |
| Any module's routes mounted             | ❌ **`createApiRoutes` still composes only `systemRoutes`** |
| Web features for auth / monitors / runs | ❌ not started                                              |

The API still serves exactly four endpoints — `/health`, `/ready`, `/metrics`,
`/meta`. **Everything in `packages/server` is unreachable over HTTP until §4 is
done.**

## 3. Findings that will bite you

Each of these was verified this session, not inferred.

### 3.1 Migrations now run on boot — resolved

`RUN_MIGRATIONS_ON_BOOT` is read by `apps/api/src/main.ts`, which calls
`runMigrations` from `@scraper/db/migrator` before `app.listen`. The runner applies
`packages/db/migrations/*.sql` in lexical order, idempotently, tracking applied
filenames in a `schema_migrations` table it creates itself, under a fixed Postgres
advisory lock (`DATABASE_LOCK.migrations` in `@scraper/core/constants`) so multiple
API replicas booting together don't race. A migration failure exits the process
non-zero before it ever calls `app.listen`, so a broken schema can't serve traffic.
See [packages/db/src/migrator.ts](../packages/db/src/migrator.ts) and
[10-DEPLOYMENT §4](./10-DEPLOYMENT.md).

`/api/v1/ready` still only checks connectivity, not schema presence — that gap is
now harmless because the schema is guaranteed to exist by the time the API accepts
traffic, but keep it in mind if you ever bypass boot migrations
(`RUN_MIGRATIONS_ON_BOOT=false`) without applying them another way.

### 3.2 The seed user cannot log in, by design

`packages/db/scripts/seed.ts` inserts `dev@example.com` with
`passwordHash = "!"` — an intentionally unusable hash. It exists to own demo
monitors, not to be an account. Do not "fix" it by putting a real hash there; add a
proper admin bootstrap (§4, step 8) instead.

### 3.3 `@universal-admin/auth-client` is not on npm

`admin-app/packages/auth-client` is the reusable implementation — it exports
`configFromEnv`, `verifyAccessToken`, `universalAuthPlugin` (an Elysia plugin) and a
log shipper, and `file-sync`/`checklists` have hand-rolled equivalents that predate
it.

```bash
npm view @universal-admin/auth-client version   # 404 — not published
```

So consuming it from scraper needs a decision, and this is the **first thing to
resolve** because it shapes the universal-mode work:

1. Publish it (it is at `0.2.0` in a private repo), or
2. Vendor the ~4 files into `packages/server`, or
3. Re-implement against the JWKS contract, which is small: `createRemoteJWKSet` +
   `jwtVerify` with `issuer` and `audience`.

Option 1 is cleanest and benefits the other two apps. Option 3 duplicates a fourth
copy of the same 20 lines and should be the last resort.

### 3.4 Verification is against the public JWKS, never the private key

From the workspace guide, and it is easy to get wrong because the wrong version
passes tests: `verifyAccessToken` must verify against `/.well-known/jwks.json`, not
against key material. Access tokens are **RS256, audience-scoped** — `aud` is the app
slug — and refresh tokens are **opaque, hashed at rest, and rotated on every use**.
Never a shared HMAC secret; that would let every downstream app mint tokens for every
other one.

### 3.5 Use `||`, not `??`, for the universal env defaults

Docker Compose interpolates an unset `${VAR:-}` to an **empty string**, which `??`
accepts as a real value. Every downstream app has hit this.

### 3.6 Anything added to the compose anchor must be a bare name

`deploy/docker-compose.yml`'s `x-app-environment` forwards a fixed list. A variable
outside it is silently ignored — 23 documented variables already are, listed in
[`deploy/portainer/STACK.md`](../deploy/portainer/STACK.md) §3a. Add
`AUTH_MODE`, `UNIVERSAL_AUTH_URL`, `UNIVERSAL_AUTH_ISSUER`, `UNIVERSAL_AUTH_APP` and
`UNIVERSAL_AUTH_API_KEY` there **as bare names**, not as `NAME=${NAME:-}` — the
assignment form sets an empty string that overrides the app's own default.

### 3.7 Routes go on `createApiRoutes`, never `createApp`

`apps/api/src/app.ts` exports both. `createApiRoutes` has paths at the root and is
what `gen:openapi` generates from; `createApp` mounts it under `/api/v1`. Registering
on `createApp` would prefix the document's paths a second time on top of its
`servers` entry and send every generated client call to `/api/v1/api/v1/…`.

## 4. Build order — what is left

Steps 1–8 of the original plan are done. Each remaining step should land green —
`pnpm lint && pnpm typecheck && pnpm test` — before the next.

1. **Mount the modules. This is the blocker for everything else.**
   `apps/api/src/app.ts` still composes only `systemRoutes`, so none of
   `packages/server` is reachable. You need to:
   - add the module layers to `apps/api/src/runtime.ts` (the worker already does
     this for the jobs module — copy the shape),
   - `.use(...)` each module's exported plugin on **`createApiRoutes`**, never
     `createApp` (§3.7),
   - run `pnpm gen:openapi && pnpm gen:api`, and commit both. CI's
     `verify-generated` fails on drift.
   - `apps/api` will need `@scraper/server` as a dependency; the worker already has it.
2. **Call the admin bootstrap.** `modules/auth` exports it as an effect but nothing
   invokes it. It belongs in `apps/api/src/main.ts` after migrations, gated on
   `local` mode.
3. **`modules/monitors`** — Phase 1 stream B. Monitor + extractor CRUD, schedule
   validation, ownership filtered at the query level, pagination. It depends on
   `jobs` for `upsertSchedule` and on `scraping`'s `UrlGuard`.
4. **`modules/runs`** — Phase 2 stream G, the 14-step pipeline: diffing, change
   persistence, the 11 rule triggers, throttle / quiet hours / digest / dedupe. This
   is the largest remaining piece and the one that makes the product work. The jobs
   module already defines the injectable `ScrapeRunner` / `NotifyRunner` handler
   interfaces it must implement.
5. **Web features** — `web/features/auth`, `monitors`, `runs`, `channels`. The design
   system, layouts and generated client are already in place; these are the consumers.
6. **Integration checkpoint I1**: create a monitor, watch a scheduled run write a row
   in `runs`.

## 5. Conventions you cannot skip in this repo

- **No comments.** Lint-enforced (`local/no-comments`). Rationale goes in the module
  README — that is what the rule's message tells you to do.
- **No magic strings.** Shared strings live in `@scraper/core/constants`.
- **Never work around a failure.** No `eslint-disable`, no deleted tests, no
  `allowDefaultProject` to silence a parser error — give the file a real tsconfig
  instead. A new `.ts` outside an existing `include` will hit this; `apps/api/tsconfig.json`
  covers `src/**` and `scripts/**` only.
- **`process` is banned** outside `packages/core/src/config` and `**/scripts/**`.
- **Regenerate before pushing:** `pnpm gen:openapi && pnpm gen:api && pnpm gen:env`
  then `git diff --exit-code`. CI's `verify-generated` fails on any drift, and it has
  caught real bugs.
- Commit messages go through commitlint — `chore(release): vX` passes, `release: vX`
  does not.

## 6. Open questions for the user

1. **Publish `@universal-admin/auth-client`, vendor it, or re-implement?** (§3.3)
2. **In `universal` mode, is local registration disabled entirely**, or still allowed
   alongside delegated identity?
3. **What is scraper's app slug** in `admin-app` — presumably `scraper`, and it needs
   registering there with its roles before `aud` checks will pass.

## 7. Verifying the stack while you work

```bash
cd deploy
docker compose up -d --build          # builds from source, no registry needed
curl -s localhost:8080/api/v1/ready   # {"status":"ok","checks":{"database":true,"redis":true}}
```

Five variables are required: `APP_URL`, `POSTGRES_PASSWORD`, `ENCRYPTION_KEY`,
`SESSION_SECRET`, `BROWSER_TOKEN`. `docker compose down -v` resets the database —
note that a stale `pgdata` volume causes `password authentication failed`, because
Postgres only applies `POSTGRES_PASSWORD` when initialising an empty data directory.
