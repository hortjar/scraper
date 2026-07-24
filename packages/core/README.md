# @scraper/core

The contract every other package builds on. It depends on nothing in the
workspace and nothing outside `effect`, `intl-messageformat`, and `uuid`.

If two modules need to agree on something, it belongs here.

## What lives here

| Path | Holds |
|---|---|
| `src/constants/` | Every string that repeats or crosses a boundary |
| `src/domain/` | Branded ids, Effect Schema models, value objects |
| `src/errors/` | The tagged error taxonomy and the `AppError` union |
| `src/config/` | Effect `Config` for every environment variable, plus `ENV_SPEC` |
| `src/i18n/` | Message keys, ICU catalogs, the `Translator` service |
| `src/observability/` | JSON logger, metrics, the HTTP failure mapping |

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
yield* new MonitorNotFound({ id })
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
- `src/config/env-spec.ts` — the metadata (group, default, secret, description)

`pnpm gen:env` renders `deploy/.env.example` from the spec, so the example file
cannot drift. `env-spec.test.ts` fails if either side gains a variable the other
doesn't have.

Secrets use `Config.redacted` and never carry a default value.

```ts
const config = yield* AppConfig
config.scraping.minIntervalSeconds
```

`process.env` is read here and nowhere else in the repo; ESLint enforces it.

## i18n

Keys are declared in `src/i18n/keys.ts` as the `MSG` tree and translated in
`src/i18n/locales/<locale>.ts`. The `cs` catalog is typed as `Catalog`, so a
missing key is a type error rather than a runtime fallback.

```ts
const translator = yield* Translator
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
4. New env var → both `schema.ts` and `env-spec.ts`, then `docs/11-ENVIRONMENT.md`.
5. New user-facing string → `MSG` plus every locale catalog.
