# @scraper/core

The contract every other package builds on. It depends on nothing in the
workspace and nothing outside `effect`, `intl-messageformat`, and `uuid`.

If two modules need to agree on something, it belongs here.

## What lives here

| Path                 | Holds                                                           |
| -------------------- | --------------------------------------------------------------- |
| `src/constants/`     | Every string that repeats or crosses a boundary                 |
| `src/domain/`        | Branded ids, Effect Schema models, value objects                |
| `src/errors/`        | The tagged error taxonomy and the `AppError` union              |
| `src/config/`        | Effect `Config` for every environment variable, plus `ENV_SPEC` |
| `src/i18n/`          | Message keys, ICU catalogs, the `Translator` service            |
| `src/observability/` | JSON logger, metrics, the HTTP failure mapping                  |

## Constants

A string literal that appears twice, or crosses a module boundary, is a constant.
`QUEUE.scrape` renamed in one place is a compile-time sweep; a typo'd `"scrape"`
in a worker registration is a queue that silently never consumes.

```ts
import { QUEUE, SPAN, ERROR_CODE, REDIS_KEY } from "@scraper/core/constants"

REDIS_KEY.domainRateLimit("example.com")
```

Module-local constants stay in the module. Only shared ones come here.

## Errors

Errors carry data, never prose:

```ts
yield * new MonitorNotFound({ id })
```

The sentence a human reads is produced at the edge by `toHttpFailure`, which maps
every tag to a status, an `ERROR_CODE`, and a message key. It uses
`Match.tagsExhaustive`, so **adding an error tag without a mapping fails the
build** rather than producing a surprise 500.

The `pipe`-chain form of `Match.tag` is deliberately not used — TypeScript's
`pipe` overloads run out around twenty arguments and silently degrade the union
to `never`, which is how the mapping loses exhaustiveness without telling you.

## Config

Every variable is declared twice on purpose, and a test enforces that the two
agree:

- `src/config/schema.ts` — the Effect `Config` that reads and validates it
- `src/config/environment-spec.ts` — the metadata (group, default, secret, description)

### Connection URLs are assembled, never pasted

`DATABASE_URL` and `REDIS_URL` are **derived** from parts — `POSTGRES_HOST`,
`POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_PASSWORD`, and the
`REDIS_*` equivalents. The password is therefore configured in exactly one place
instead of being duplicated into a connection string that nothing cross-checks.

The assembly percent-encodes the userinfo section, which is not cosmetic:
`openssl rand -base64 32` — the command the deployment docs tell you to run —
produces passwords containing `+`, `/` and `=`. Pasted raw into a URL those change
where the host begins, and the failure surfaces as an unrelated-looking connection
error. `encodedUserInfo` is what makes an arbitrary password safe to carry.

Setting `DATABASE_URL` or `REDIS_URL` explicitly still wins. That escape hatch
exists for managed providers that issue one connection string and no parts.

### The app version comes from package.json

`readPackageVersion` reads the calling app's own `package.json`. `seedAppVersion`
combines it with any `APP_VERSION` override and is called once from `main.ts` in both
`api` and `worker`; the web build does the equivalent in `vite.config.ts` for
`__APP_VERSION__`. Nobody has to pass a version at build time for `/api/v1/health`
and the UI to report the real one.

**A blank override counts as unset**, which is the whole point. Docker Compose
interpolates an unset `${APP_VERSION:-}` to an **empty string**, so `??` and `??=`
accept it as a real value — the web UI reported `dev` and the API reported `unknown`
for exactly this reason. `blankToUndefined` is what makes the fallback fire. The
Dockerfiles default their `APP_VERSION`/`GIT_SHA` build args to `""` rather than a
placeholder for the same reason: a placeholder is indistinguishable from a real
answer once it reaches the app.

An explicit non-blank `APP_VERSION` still wins, so an operator can pin a version
without rebuilding — `deploy/entrypoint.sh` writes it into the web bundle's runtime
`config.js`, and `appConfig` prefers it over the baked value. A missing or malformed
`package.json` returns `undefined` rather than throwing, so the config default
applies instead of the process failing to start.

`GIT_SHA` has no such source and stays a build arg, falling back to `local`.

### Mail is optional, and absence is a first-class state

`mailConfig.isAvailable` reports whether a transport is actually configured:
a non-empty `MAIL_FROM`, plus `SMTP_HOST` on the `smtp` driver or `RESEND_API_KEY`
on `resend`. The `console` driver needs only the sender. Whitespace counts as unset.

Nothing is required to boot. An instance with no mail configuration starts normally
and reports `emailAvailable: false` from `/api/v1/meta`, so the frontend can hide
email channels rather than offering a delivery that would silently fail.

`pnpm gen:env` renders `deploy/.env.example` from the spec, so the example file
cannot drift — but only if you re-run it. CI's `verify-generated` job runs the
generators and fails on any diff, which is what catches a spec change that never
made it into the example. `environment-spec.test.ts` fails if either side gains a
variable the other doesn't have.

Secrets use `Config.redacted` and never carry a default value.

```ts
const config = yield * AppConfig
config.scraping.minIntervalSeconds
```

`process.env` is read here and nowhere else in the repo; ESLint enforces it.

## i18n

Keys are declared in `src/i18n/keys.ts` as the `MSG` tree and translated in
`src/i18n/locales/<locale>.ts`. The `cs` catalog is typed as `Catalog`, so a
missing key is a type error rather than a runtime fallback.

```ts
const translator = yield * Translator
translator.render(MSG.errors.rateLimited, { seconds: 30 }, "cs")
```

Formatting is ICU via `intl-messageformat`. Czech has a `few` plural form that
English does not — that is why counts are never concatenated into a sentence.

Notifications resolve against the **recipient's** locale, not the request's.

`pnpm i18n:check` fails on a key missing from any locale, a catalog entry not
declared in `MSG`, or an orphaned translation.

## Adding to this package

1. New shared constant → the matching file in `src/constants/`, exported from its barrel.
2. New entity → a schema in `src/domain/`, and update `docs/02-DATA-MODEL.md`.
3. New error → `src/errors/index.ts`, add it to the `AppError` union, and add its
   mapping to `toHttpFailure`. The build will tell you if you forget.
4. New env var → both `schema.ts` and `environment-spec.ts`, then `pnpm gen:env`
   and `docs/11-ENVIRONMENT.md`.
5. New user-facing string → `MSG` plus every locale catalog.
