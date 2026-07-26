# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file starts at 0.2.0. For anything earlier, see the git history.

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
