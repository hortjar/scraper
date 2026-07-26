# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file starts at 0.2.0. For anything earlier, see the git history.

## [0.4.0] - 2026-07-26

### ⚠️ BREAKING — the API is served at `/api/v1`, and the environment changed

Three related contract changes. Each removes a case where two parts of the system
disagreed and nothing caught it.

#### The API now serves the base path it always advertised

`ROUTE.apiBase` (`/api/v1`) has been in the constants, the OpenAPI `servers` entry,
the generated client's `baseUrl` and the web app's fallback since the start — but the
Elysia app mounted its routes at the root, so **every browser call 404'd.** The app
is now mounted under the base path.

- `GET /health` → **`GET /api/v1/health`**, same for `/ready`, `/metrics`, `/meta`.
- Swagger UI moves from `/docs` to **`/api/v1/docs`**.
- Prometheus should scrape **`api:9300/api/v1/metrics`**.
- The OpenAPI document is unchanged: its paths stay relative because `servers`
  carries the base. `pnpm gen:openapi` therefore generates from the new
  `createApiRoutes` export rather than the mounted `createApp` — generating from the
  mounted app would prefix the paths a second time and send clients to
  `/api/v1/api/v1/…`.

`API_URL` also defaulted to `http://api:9300`, a Docker network hostname written
into `config.js` and read by the **user's browser**, where it cannot resolve. It now
defaults to the relative `/api/v1`.

#### Database and Redis URLs are assembled from parts

`DATABASE_URL` is no longer required and is no longer the place credentials live.
The connection string is built from `POSTGRES_HOST` (`postgres`), `POSTGRES_PORT`
(`5432`), `POSTGRES_USER` (`scraper`), `POSTGRES_DB` (`scraper`) and
`POSTGRES_PASSWORD` — the same password variable the `postgres` service already
uses, so it is written once. Redis is built the same way from `REDIS_HOST`,
`REDIS_PORT`, `REDIS_DB` and an optional `REDIS_PASSWORD`.

This fixes a real failure, not just duplication. The deployment docs tell you to
generate secrets with `openssl rand -base64 32`, which produces `+`, `/` and `=` —
characters that change where a URL's host begins. Pasted into the old `DATABASE_URL`
they produced a connection error pointing nowhere near the cause. The parts are
percent-encoded on assembly, so any password works.

Setting `DATABASE_URL` or `REDIS_URL` explicitly still wins, for a managed provider
that issues one connection string. Existing deployments and the CI integration job
keep working unchanged through that path.

Setting `REDIS_PASSWORD` now also configures the bundled Redis: `--requirepass` and
the healthcheck's `-a` flag are both derived from it, so the probe cannot fail with
`NOAUTH` while the server demands a password.

**To migrate:** replace `DATABASE_URL` with `POSTGRES_PASSWORD` in your stack
variables, or keep `DATABASE_URL` and change nothing.

#### Email is optional

`MAIL_FROM` is no longer required. An instance with no mail configuration starts
normally and reports `emailAvailable: false` from `/api/v1/meta`, so the UI can hide
email channels instead of offering a delivery that would fail.

Email counts as available when `MAIL_FROM` is set **and** a transport is: `SMTP_HOST`
on the `smtp` driver, `RESEND_API_KEY` on `resend`. The `console` driver needs only
the sender. Whitespace counts as unset.

### Added

- `emailAvailable` on the `/api/v1/meta` response.
- `packages/core/src/config/schema.test.ts` — 17 tests covering URL assembly,
  percent-encoding, the explicit-URL escape hatch and every mail-availability branch.
- `docs/17-DEPLOY-RUNBOOK.md` §4a documents the base path and the five components
  that have to agree on it.

### Fixed

- **`verify-generated` had been failing on every CI run since 0.2.0.**
  `deploy/.env.example` embeds the name of the file it was generated from, and that
  name changed when `env-spec.ts` became `environment-spec.ts` during the 0.3.0 lint
  sweep. The example was never regenerated, so `git diff --exit-code` found a
  one-line drift every time. No variable was affected.
- Three stale `env-spec.ts` references in `packages/core/README.md`.

### Known gaps

- **`bun run healthcheck.ts` does not exist.** Both Dockerfiles and the compose file
  reference it; nothing in the repo creates it. Both containers therefore stay
  `unhealthy`, and because `worker` waits on `condition: service_healthy`, **the
  worker never starts.** For the API the fix is a one-line probe against
  `/api/v1/ready`; for the worker it is a design question, since it runs no HTTP
  server. Documented in `deploy/portainer/STACK.md`.
- **`STORAGE_DRIVER=s3` cannot be configured from Portainer.** The driver name is
  forwarded to the containers but none of the five `S3_*` credentials are. 23
  documented variables are absent from the compose anchor; they are listed in
  `STACK.md` §3a.

## [0.3.0] - 2026-07-26

### ⚠️ BREAKING — CI no longer builds or publishes images

The `build-and-push` job is gone from `.github/workflows/release.yml`. Pushing a
`v*` tag now creates the GitHub release and nothing else — **it does not produce a
`ghcr.io/<org>/scraper-*` image.**

If you deploy from Portainer or any pinned-tag stack, this changes your upgrade
procedure: build and push the images yourself before setting `IMAGE_TAG`, using the
existing `deploy/docker-compose.build.yml` overlay. An `IMAGE_TAG` naming a tag that
was never pushed now fails at pull time rather than resolving to something CI made.

Note also that `docker compose build` produces **one architecture, the build host's**.
The removed job used buildx for `linux/amd64,linux/arm64`, so an ARM deploy target
built from an x86 machine (or the reverse) needs `docker buildx bake` or a build on
matching hardware. `docs/10-DEPLOYMENT.md` §8 and `deploy/portainer/STACK.md` §8 carry
the commands.

Nothing about the images themselves changed — the Dockerfiles, the compose files and
the tag scheme are untouched. Only the thing that used to run the build was removed.

### Changed

- `@hortjar/eslint-config` upgraded to `0.3.1`, and **both
  `scraper/pending-hortjar-eslint-config-0.3.1*` blocks are deleted** from
  `eslint.config.ts` — the two overrides they carried (`repository` left unabbreviated,
  `no-var` off in `.d.ts`) now come from the shared config, which is where they
  belonged. This closes the "Known gaps" item recorded under 0.2.0. Lint stays clean
  at `--max-warnings 0` with no local exception.

## [0.2.0] - 2026-07-25

### ⚠️ BREAKING — default ports moved into the 9300 block

Every port now lives in `9300–9399`, so this stack no longer collides with the other
self-hosted apps in the workspace. `file-sync` previously claimed the same API port
and the same Postgres port, so the two could not run at once.

| What                     | Old    | New    |
| ------------------------ | ------ | ------ |
| API (`API_PORT`)         | `3001` | `9300` |
| Web dev server (Vite)    | `3000` | `9301` |
| Postgres, host-published | `5432` | `9302` |
| Redis, host-published    | `6379` | `9303` |

**Container-internal Postgres and Redis are unchanged** at 5432 and 6379 — only the
host-published side moved. `deploy/.env.example` was regenerated from
`packages/core/src/config` with `pnpm gen:env` rather than hand-edited.
`docs/10-DEPLOYMENT.md` and `docs/11-ENVIRONMENT.md` were updated in the same change.

### Fixed

- **`appConfig` threw at import time when `config.js` had not loaded.** The runtime
  config fallback was lost while satisfying `unicorn/prefer-global-this`, so
  `window.__APP_CONFIG__` being absent — its normal state until the injected script
  runs — crashed the module instead of falling back to defaults. The global is now
  declared optional, so the type matches reality and the fallback cannot be dropped
  again silently.
- `packages/db`'s barrel imported `./repository.js` after the file had been renamed,
  breaking `pnpm typecheck` for the package.

### Changed

- `@hortjar/eslint-config` upgraded to `0.3.0`, and every resulting lint error fixed
  at its cause. No rule disabled inline, no suppression, no test weakened.
- **The shared eslint layers moved into `@hortjar/eslint-config`.** `packages/tooling`
  now keeps only tsconfig and prettier presets, and `eslint.config.ts` holds just this
  repo's architecture rules.
- A root `tsconfig.json` type-checks the root config files against real compiler
  options instead of typescript-eslint's inferred default project, which had no Node
  types and made `import.meta.dirname` error-typed.
- `packages/db`'s drizzle handle types renamed `Db` → `DrizzleDatabase`,
  `DbTransaction` → `DatabaseTransaction`, `DbExecutor` → `DatabaseExecutor`, which
  also removes the ambiguity with the `Database` Effect service.
- Non-component exports moved out of component modules to satisfy React Fast Refresh;
  test helpers split into `src/test/browser-stubs.ts`.

### Known gaps

Two `unicorn` defaults are overridden in `eslint.config.ts` under blocks named
`scraper/pending-hortjar-eslint-config-0.3.1`, because neither could be satisfied
honestly:

- `repository` → `repo` demands the abbreviation the rule exists to remove.
- `no-var` rejects `declare var`, the only way to add a property to
  `typeof globalThis`.

Both are fixed upstream in `@hortjar/eslint-config` 0.3.1. **Delete both blocks when
this repo upgrades to it.**
