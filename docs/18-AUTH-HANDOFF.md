# Auth — Implementation Handoff

**Status: not started. No auth code exists in this repository.**

This is a handoff, not a design doc. The design is
[08-AUTH](./08-AUTH.md); this page records what is actually on disk as of
**0.6.0 (2026-07-26)**, the decisions already made, the traps found the hard way,
and the order to build in. Read it before touching anything.

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

| Thing                                     | State                                                          |
| ----------------------------------------- | -------------------------------------------------------------- |
| `packages/db/src/schema/identity.ts`      | ✅ `users`, `sessions`, `apiKeys`, `verificationTokens`        |
| `packages/db/migrations/0000_init.sql`    | ✅ exists, creates those tables                                |
| `packages/core/src/config/schema.ts`      | ✅ `securityConfig` — argon2 params, session TTLs, cookie name |
| `ROUTE.auth`, `API_TAG`, error taxonomy   | ✅ constants declared                                          |
| `docs/08-AUTH.md`                         | ✅ the design to implement                                     |
| `packages/server/src/modules/`            | ❌ **does not exist** — the directory has no subdirectories    |
| Any login/session/hashing code            | ❌ none                                                        |
| argon2 or any password-hashing dependency | ❌ not installed                                               |
| Auth routes mounted                       | ❌ `createApiRoutes` mounts only `systemRoutes`                |

The four endpoints the API serves today — `/health`, `/ready`, `/metrics`, `/meta` —
are the entire API surface.

## 3. Findings that will bite you

Each of these was verified this session, not inferred.

### 3.1 Migrations never run — the deployed database is empty

`RUN_MIGRATIONS_ON_BOOT` is declared in `securityConfig`… and read by nothing.

```bash
grep -rn "runMigrationsOnBoot" --include="*.ts" apps packages   # config + spec only
```

[10-DEPLOYMENT §4](./10-DEPLOYMENT.md) claims the API runs `drizzle-kit migrate` on
boot under a Postgres advisory lock. **That is not implemented.** The migration SQL
exists but nothing applies it in the container, so a freshly deployed stack has a
database with **no tables**.

This is invisible today because `/api/v1/ready` only checks connectivity — the stack
reports healthy against an empty schema. Auth is the first feature that touches a
table, so **this must be fixed first or nothing will work.**

Either implement the documented boot-time migration, or change the doc. Do not leave
them disagreeing.

### 3.2 The seed user cannot log in, by design

`packages/db/scripts/seed.ts` inserts `dev@example.com` with
`passwordHash = "!"` — an intentionally unusable hash. It exists to own demo
monitors, not to be an account. Do not "fix" it by putting a real hash there; add a
proper admin bootstrap (§4.6) instead.

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

## 4. Build order

Each step should land green — `pnpm lint && pnpm typecheck && pnpm test` — before the
next.

1. **Run migrations on boot.** §3.1. Blocks everything. Advisory lock so replicas
   cannot race, per the existing doc.
2. **Resolve the `auth-client` question.** §3.3. Shapes step 6.
3. **Password hashing.** Add argon2, wire `securityConfig.argon2MemoryKib` /
   `argon2TimeCost`. Keep it behind a small service so `universal` mode can skip it.
4. **Local sessions.** `sessions` table, `SESSION_COOKIE_NAME`, `SESSION_TTL_SECONDS`
   and `SESSION_ABSOLUTE_TTL_SECONDS` are all already in config. Secure, `SameSite=Lax`
   — same-origin is why no CSRF token is needed, so do not break the `/api/v1` proxy
   assumption.
5. **Routes** on `createApiRoutes` (§3.7): register, login, logout, me. Every route
   needs a `response` schema wrapped in `Schema.standardSchemaV1(...)`, a unique
   camelCase `operationId`, and `tags` — see [09-API §3](./09-API.md). A bare
   `Schema.Struct` is silently ignored by Elysia and produces an unvalidated route
   with an empty schema in the document.
6. **Universal mode.** `AUTH_MODE=universal` verifies bearer tokens against
   `admin-app`'s JWKS with `issuer` and `audience` checks, and JIT-provisions a local
   `users` row on first sight of a subject.
7. **API keys, verification tokens, password policy, rate limiting** — the rest of
   08-AUTH. `RATE_LIMIT_ENABLED` and `PASSWORD_BREACH_CHECK` already exist in config.
8. **Admin bootstrap.** `ADMIN_EMAIL` / `ADMIN_PASSWORD`, created idempotently on
   first start — `file-sync` does exactly this and is worth copying. Only meaningful
   in `local` mode.

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
