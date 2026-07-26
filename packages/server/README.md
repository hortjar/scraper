# @scraper/server

Feature modules. This is where features live — not in new packages.

`apps/api` and `apps/worker` are composition roots: they wire modules together and
own no business logic. `packages/core` is the shared contract, `packages/db` is
persistence. Everything else is a module here.

## Anatomy

```
src/modules/<name>/
├── <name>.constants.ts    module-local constants
├── <name>.errors.ts       tagged errors specific to this module
├── <name>.schema.ts       Effect Schemas: inputs, outputs, DTOs
├── <name>.repository.ts   DB access, returns domain types
├── <name>.service.ts      Effect.Service — the module's public API
├── <name>.routes.ts       Elysia plugin, thin
├── <name>.messages.ts     i18n keys this module owns
├── index.ts               the module contract
├── README.md              what it owns, how to extend it
└── *.test.ts              colocated
```

`index.ts` is the contract. Reaching past it — `../monitors/monitors.repository` —
is a lint error, so a module is as isolated as a package was without needing its
own `package.json`.

A file past 300 lines splits. A module past ~8 files is two modules.

## Rules that are enforced, not suggested

- **`Effect.fn(SPAN.x.y)` wraps every service method.** Free trace spans, and a
  stack trace that points at the call site rather than generator internals.
- **A service returns a `const` object of functions**, never a class instance.
- **Dependencies are `yield*`-ed at construction**, not inside methods.
- **The error channel is explicit and narrow.** `Effect<Monitor, MonitorNotFound |
DatabaseError>` is the documentation.
- **Authorization is in the service, not the route.** Every method takes a `userId`
  and filters at the query level. There is no code path that loads a row and then
  checks who owns it, because that is how IDOR bugs happen.
- **`scraping` must not import `packages/db`.** It is pure input → output; the lint
  config has a zone for it.
- No `process.env`, `Date.now()`, `Math.random()` or `console` — use `AppConfig`,
  `Clock`, `Random` and `Effect.log*`.

## Adding a module

1. Create the directory with the layout above.
2. Add its `SERVICE_TAG` and any `SPAN` entries to `@scraper/core/constants`.
3. Add its errors to the `AppError` union in `core/src/errors` and to
   `toHttpFailure` — the build fails if you forget the mapping.
4. Export it from `src/index.ts` and add its subpath to `package.json` `exports`.
5. Mount its routes on `createApiRoutes` in `apps/api/src/app.ts` — **never**
   `createApp`, which would prefix the OpenAPI paths a second time.
6. Regenerate: `pnpm gen:openapi && pnpm gen:api`.
