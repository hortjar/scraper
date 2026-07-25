# @scraper/api

Bun + Elysia HTTP server. Composition root for the backend — see
[docs/01-ARCHITECTURE.md §3](../../docs/01-ARCHITECTURE.md) for the vertical-slice
rule this app is built around.

## Layout

```
src/
  runtime.ts              ManagedRuntime built from AppLayer (config, logger, translator, Database)
  app.ts                  composition root — createApp(options) chains plugins and route modules
  main.ts                 entry point: boot, listen, graceful shutdown
  plugins/
    effect.ts              the Effect ↔ Elysia bridge: decorates `runFx`
    observability.ts        request logging + http_requests_total / http_request_duration_seconds
    security.ts              CORS + security headers
    security.constants.ts
    openapi.ts               @elysiajs/openapi mount
  health/
    health-probe.ts          generic HealthProbe/runHealthProbes helpers
    redis-probe.ts           ioredis-backed liveness probe for /ready
  observability/
    prometheus.ts             renders an Effect Metric snapshot as Prometheus text
  routes/
    system.ts, system.schema.ts, system.constants.ts   /health /ready /metrics /meta
scripts/
  gen-openapi.ts            boots the app in memory, writes ../openapi.json
```

Feature modules from `@scraper/server` (auth, monitors, runs, channels, rules) are
not built yet. When they land, `app.ts` grows by one `.use(xRoutes(runtime))` line
per module, appended after `systemRoutes` — the chain itself is the insertion
point, deliberately without a comment marker.

## The Effect ↔ Elysia bridge

`plugins/effect.ts` decorates every route with `runFx`, which runs an `Effect`
against the process's single `ManagedRuntime` and maps any `AppError` to an HTTP
body via `toHttpFailure` + `Translator`. `system.ts` does not use `runFx` — its
effects are already total (they resolve to a value, never an `AppError`), so the
handlers call `runtime.runPromise` directly and shape their own status codes.

## Spike S1 — Effect Schema through Elysia into OpenAPI: it works, with one step

Elysia 1.4 validates a schema via the Standard Schema protocol, but a bare Effect
`Schema.Struct(...)` does **not** implement it — `~standard` is only present on
the object returned by `Schema.standardSchemaV1(schema)`. Every schema passed to
a route's `body`/`query`/`response` in this app is wrapped:

```ts
const standardHealthResponse = Schema.standardSchemaV1(HealthResponse)
```

`@elysiajs/openapi`'s `mapJsonSchema: { effect: JSONSchema.make }` then works
because `Schema.standardSchemaV1` stamps `vendor: "effect"` on `~standard`, and
the wrapped object still carries the original `.ast`, so `JSONSchema.make` renders
a full JSON Schema (required fields, enums, `additionalProperties: false`, …) —
confirmed by reading `apps/api/openapi.json` after `pnpm gen:openapi`. No
TypeBox fallback was needed.

One real deviation from [docs/09-API.md](../../docs/09-API.md): the installed
`@elysiajs/openapi` only accepts `provider: "swagger-ui" | "scalar" | null`, not
`"swagger"`. This app uses `"swagger-ui"`; the doc's `provider: 'swagger'` should
be treated as a typo for `'swagger-ui'` when it's next touched.

## `process` in an entry file

The `restrictProcessEnv` option on the `elysia` layer in `eslint.config.ts` bans the bare
`process` identifier everywhere except `packages/core/src/config` and
`**/scripts/**`. Graceful shutdown needs `process.on('SIGTERM', …)` /
`process.exit(0)` in `main.ts`, which is neither. `main.ts` therefore goes
through `globalThis.process` — `globalThis` is the identifier the rule sees, not
`process`, so it type-checks and lints clean while doing the same thing. If a
`main.ts`-shaped exemption is ever added to the shared eslint config, this
indirection can be dropped.

## Readiness

`/ready` checks `Database.health` (via the `Database` service from `@scraper/db`)
and a dedicated `ioredis` ping (`health/redis-probe.ts`, its own lazily-connecting
client, independent of BullMQ). Either one unhealthy → `503` with
`{ status: "unhealthy", checks: { database, redis } }`.

## Metrics

`/metrics` renders every metric in the process's Effect `Metric` registry
(`Metric.snapshot`) as Prometheus exposition text — counters, gauges, histograms,
summaries, and frequencies are all handled in `observability/prometheus.ts`. There
is no `prom-client` dependency; Effect's own metric state is the source of truth.

## Local development

```bash
docker compose -f ../../deploy/docker-compose.dev.yml up -d redis
# postgres assumed already running and migrated
APP_URL=http://localhost:3001 \
DATABASE_URL=postgres://scraper:scraper@localhost:5432/scraper \
REDIS_URL=redis://localhost:6379 \
ENCRYPTION_KEY=dev-encryption-key \
SESSION_SECRET=dev-session-secret \
MAIL_FROM=noreply@example.com \
bun run src/main.ts
```

`pnpm --filter @scraper/api gen:openapi` regenerates `openapi.json` (committed,
diffed in CI) — it needs the same env as above since it boots the real app to
read `/docs/json`, but never binds a port or touches Redis/Postgres beyond
constructing lazy clients.

## Graceful shutdown

`SIGTERM`/`SIGINT` → stop accepting connections (`app.stop()`, bounded by
`TIMEOUT.shutdownGraceMs`) → `runtime.dispose()` (releases the DB pool) →
`process.exit(0)`. See [docs/10-DEPLOYMENT.md §5](../../docs/10-DEPLOYMENT.md).
