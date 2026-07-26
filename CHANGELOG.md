# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file starts at 0.2.0. For anything earlier, see the git history.

## [0.6.0] - 2026-07-26

### Added

- **`docs/18-AUTH-HANDOFF.md`** — auth is the next feature and none of it is built.
  The handoff records the verified state of the repo, the blockers found while
  checking, the decision to implement the full `08-AUTH` scope _plus_ an
  `AUTH_MODE=local|universal` switch against `admin-app`, and the order to build in.
  `AGENTS.md`, `docs/README.md` and `08-AUTH.md` all point at it.

### Documented — not fixed

- **`RUN_MIGRATIONS_ON_BOOT` is read by nothing.** `10-DEPLOYMENT` §4 claims the API
  applies migrations on boot under an advisory lock; grep finds only the config field
  and the env spec. The SQL in `packages/db/migrations/` exists but nothing runs it in
  the container, so a freshly deployed stack has **no tables** — invisible today
  because `/api/v1/ready` only checks connectivity. §4 now carries a warning, and
  fixing it is step 1 of the auth handoff.

### Changed

- **The app version is read from `package.json`.** `apps/api` and `apps/worker` seed
  `APP_VERSION` from their own `package.json` at startup, and `apps/web` bakes it into
  `__APP_VERSION__` at build time from the same source. `/api/v1/health` and the UI
  now report the real version without anyone passing a build arg — previously an
  unset `APP_VERSION` meant the images reported `dev`.

  An explicit `APP_VERSION` still overrides. A missing or malformed `package.json`
  yields `undefined` rather than throwing, so the config default applies instead of
  the process failing to boot. `GIT_SHA` has no equivalent source and remains a build
  arg defaulting to `local`.

## [0.5.1] - 2026-07-26

### Fixed

- **`pull access denied for local/scraper-api` when deploying from Portainer.**
  0.5.0 put the `build:` config in a separate `docker-compose.build.yml`, but a
  Portainer Git stack points at **one** compose path. Running
  `deploy/docker-compose.yml` alone therefore tried to pull `local/scraper-api:dev`,
  a name no registry serves.

  The build config now lives in `docker-compose.yml` itself, with
  `pull_policy: ${IMAGE_PULL_POLICY:-build}`. A single-path deploy builds from the
  clone with nothing extra to configure. `docker-compose.build.yml` is **removed**;
  `docker compose up -d --build` needs no `-f` flags at all.

  Pulling published images is now the overlay: `docker-compose.registry.yml` sets
  `pull_policy: always`, or set `IMAGE_PULL_POLICY=always`.

- **The `web` container reported `unhealthy` while serving fine.** Its `HEALTHCHECK`
  probed `http://localhost:80/health`, and the image's `/etc/hosts` maps `localhost`
  to both `127.0.0.1` and `::1`. busybox `wget` tried `::1` first, while
  `nginx.conf` declares only `listen 80` — IPv4 — so every probe got connection
  refused. Now probes `127.0.0.1` explicitly. Nothing depends on `web` being healthy,
  so this was cosmetic in Compose but red in Portainer and actionable in any
  orchestrator that reacts to health.

Verified by deleting all three images and running `docker compose up -d` against the
base file alone: it built from scratch and every service reached `healthy`, with
`/api/v1/health`, `/api/v1/ready`, `/api/v1/meta` and `/` all 200.

## [0.5.0] - 2026-07-26

### ⚠️ BREAKING — the stack builds from source, and no image variable is required

`IMAGE_REGISTRY` and `IMAGE_TAG` replace `GH_ORG`/`IMAGE_TAG` and now **default** to
`local` and `dev`, so nothing about images has to be configured:

```bash
cd deploy && docker compose up -d --build
```

Five variables and one command. Previously `${IMAGE_TAG:?required}` failed during
interpolation, which happens _before_ compose merges overlays — so the build overlay
could not rescue it and you were forced to invent image coordinates even when
building locally. Publishing to a registry is now opt-in: set both variables.

The build overlay declares `pull_policy: build` so compose builds these services
rather than trying to pull a name no registry serves.

**The images had never built at all.** All three Dockerfiles ran
`corepack enable` on an `oven/bun` base, and corepack ships with Node, not Bun —
every build died at that line with exit 127. The pnpm stages now run on Node, with
the libc matched to each runtime (`node:22-alpine` for the two musl runtimes,
`node:22-bookworm-slim` for the worker's Debian one) so native modules resolve
against the right one. A second defect surfaced behind it: `pnpm fetch` wrote to the
global store while later stages copied `/build/.pnpm-store`, so the cache mount was
always empty; every `fetch`/`install` now pins `--store-dir`.

Verified by building all three images and bringing the stack up: `/api/v1/health`,
`/api/v1/ready` (`database: true, redis: true`), `/api/v1/meta` and
`/api/v1/docs/json` all 200 through the nginx proxy, and the worker running four
queues.

### Fixed — the health check that never existed

`Dockerfile.api`, `Dockerfile.worker` and `docker-compose.yml` all ran
`bun run healthcheck.ts`, **a file that was in no commit.** Both containers stayed
`unhealthy` forever, and because `worker` waits on `condition: service_healthy`, the
worker never started — the API and UI came up looking fine while nothing was ever
scraped.

`apps/api/scripts/healthcheck.ts` now probes `/api/v1/ready`, so `service_healthy`
means the API can genuinely reach Postgres and Redis. The worker's `HEALTHCHECK` is
removed rather than faked: it runs no HTTP server, so there is nothing to probe
without inventing a listener. It reports `running`, and `restart: unless-stopped`
covers crashes.

### Known gaps

- The worker still has **no liveness signal of its own**. Asserting its BullMQ
  connection would be the natural one.
- **`STORAGE_DRIVER=s3` cannot be configured from Portainer.** The driver name is
  forwarded to the containers but none of the five `S3_*` credentials are. 23
  documented variables are absent from the compose anchor; they are listed in
  `deploy/portainer/STACK.md` §3a.

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
