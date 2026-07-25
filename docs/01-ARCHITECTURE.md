# Architecture

## 1. System shape

```
                    ┌───────────────────────────────────────────┐
   browser ───────► │  web (nginx, static Vite build)           │
                    └──────────────────┬────────────────────────┘
                                       │ /api/* proxied
                    ┌──────────────────▼────────────────────────┐
                    │  api  (Bun + Elysia + Effect)             │
                    │  auth · monitors · runs · channels · rules│
                    └────────┬──────────────────┬───────────────┘
                             │ enqueue          │ read/write
                    ┌────────▼────────┐  ┌──────▼──────────────┐
                    │ redis (BullMQ)  │  │ postgres 17         │
                    └────────┬────────┘  └──────▲──────────────┘
                             │ consume          │
                    ┌────────▼───────────────────────────────────┐
                    │  worker (Bun + Effect)                     │
                    │  scrape · diff · evaluate · notify · sweep │
                    └───┬──────────────────────────┬─────────────┘
                        │ CDP                      │ SMTP/HTTPS
              ┌─────────▼─────────┐        ┌───────▼────────────┐
              │ browser (chromium)│        │ external channels  │
              └───────────────────┘        └────────────────────┘
```

Three long-lived app processes (`api`, `worker`, `web`) plus three infra
containers (`postgres`, `redis`, `browser`). `api` and `worker` scale
horizontally and independently — `api` is I/O-light, `worker` is the expensive
one.

**Why `worker` is a separate process, not a thread in `api`:** a Playwright run
can pin a core for 30s and allocate hundreds of MB. Sharing a process with the
HTTP server makes p99 latency a function of scrape load. Separation also lets
Portainer scale workers to N replicas without touching the API.

## 2. Request → notification, end to end

1. User creates a **Monitor** (URL + engine + selectors + schedule + rules) in the UI.
2. `api` validates, persists, and calls `JobProducer.upsertSchedule(monitor)` which
   creates a BullMQ **Job Scheduler** keyed `monitor:<id>` with the cron/interval.
3. BullMQ emits a `scrape` job on schedule. A `worker` claims it.
4. Worker resolves the **ScrapeStrategy** (`http` | `browser`), fetches, and applies
   each **Extractor** to produce a `FieldValue[]`.
5. Worker writes a **Run** + **Snapshot**, then diffs against the previous snapshot
   to produce **Changes**.
6. Worker evaluates each **NotificationRule** against the changes → zero or more
   `notify` jobs.
7. The `notify` consumer renders the payload per channel, dispatches through the
   **NotificationRegistry**, and records a **Delivery** with attempt history.
8. UI polls/streams run history through TanStack Query.

Steps 4–6 are pure-ish and unit-testable: given `(previousSnapshot, html, config)`
they always yield the same `Changes`.

## 3. Repository layout

Four packages, three apps. Modules — not packages — are the unit of feature work.

```
scraper/
├── apps/
│   ├── api/          @scraper/api      Bun + Elysia HTTP server (composition root)
│   ├── worker/       @scraper/worker   BullMQ consumers (composition root)
│   └── web/          @scraper/web      Vite + React SPA (landing + console)
├── packages/
│   ├── core/         @scraper/core     Domain models, errors, constants, config,
│   │                                   i18n, observability. Depends only on `effect`.
│   ├── db/           @scraper/db       Drizzle schema, migrations, repositories
│   ├── server/       @scraper/server   Feature modules — where features live:
│   │                                     src/modules/auth
│   │                                     src/modules/monitors
│   │                                     src/modules/scraping
│   │                                     src/modules/runs
│   │                                     src/modules/notifications
│   │                                     src/modules/jobs
│   └── tooling/      @scraper/tooling  tsconfig · prettier presets
├── deploy/           Dockerfiles, compose stacks, nginx conf, Portainer guide
├── docs/
└── .github/workflows/
```

**Where the lint rules live.** The language and framework layers — TypeScript,
unicorn, import hygiene, React, Elysia — come from the published
`@hortjar/eslint-config` package, shared across every project. `eslint.config.ts`
at the repo root composes those layers and then adds the blocks that only make
sense here: the Effect primitive bans, the module-boundary zones, the `useEffect`
ban, and the component size budget. A rule that describes _this_ module graph
stays in the root config; a rule that describes a stack belongs upstream.

**Why four and not fourteen.** An earlier draft split every feature into its own
package. That buys nothing here: the isolation that matters (one owner per path,
no cross-imports, acyclic dependencies) comes from _module boundaries and lint
rules_, not from `package.json` files. Fourteen packages would have meant fourteen
build configs, fourteen version bumps, and a dependency graph to babysit. Modules
give the same guarantees with a tenth of the ceremony.

### The vertical-slice rule

A feature module owns **its schema, service, repository, routes, messages, tests,
and README**. `apps/api` is a composition root — it reads like a table of contents:

```ts
// apps/api/src/app.ts
export const app = new Elysia()
  .use(observability)
  .use(errorHandler)
  .use(authRoutes) // ─┐
  .use(monitorRoutes) //  │ from @scraper/server — one line per module,
  .use(runRoutes) //  │ added at a marked insertion point
  .use(channelRoutes) // ─┘
```

Two agents building two features touch two disjoint module trees and add one line
each here. That's the whole parallelization story.

### Dependency direction

```
apps/*  ──►  server (modules)  ──►  db  ──►  core
```

Strictly acyclic, enforced in CI by `eslint-plugin-import` boundaries:

- `core` imports nothing from the workspace.
- `db` may import `core` only.
- A module may import `core`, `db`, and other modules' `index.ts` — never another
  module's internals.
- `scraping` additionally may **not** import `db`: it is pure input→output, which
  is what makes it heavily testable.
- If two modules need the same type, it belongs in `core`.

## 4. The Effect ↔ Elysia bridge

Effect owns application logic; Elysia owns HTTP. They meet at exactly one place.

```ts
// apps/api/src/runtime.ts
export const runtime = ManagedRuntime.make(AppLayer)

// packages/core/src/observability/elysia.ts — the only place effects are run for HTTP
export const effectPlugin = new Elysia({ name: PLUGIN.effect }).decorate(
  "runFx",
  <A, E extends AppError>(fx: Effect.Effect<A, E, AppServices>) =>
    runtime.runPromise(fx.pipe(Effect.catchAll(toHttpError))),
)
```

Handlers stay one line: `({ runFx, body }) => runFx(Monitors.create(body))`.

- One `ManagedRuntime` per process, built at boot from `AppLayer`, disposed on
  `SIGTERM` — that is graceful shutdown (see 10-DEPLOYMENT §5).
- Workers get their own runtime from the same `AppLayer` minus HTTP-only layers.
- Domain errors are `Data.TaggedError`; `toHttpError` maps tags → status codes in
  one exhaustive `Match` (see 03-BACKEND §4). A new error tag that isn't mapped
  is a **type error**, not a 500 at runtime.

## 5. Cross-cutting concerns

| Concern       | Where it lives                                      | Note                                                                                    |
| ------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Config        | `core/config`                                       | Effect `Config`; fail-fast at boot with all missing vars listed at once                 |
| Constants     | `core/constants`                                    | No magic strings anywhere — queue names, error codes, headers, keys, spans              |
| i18n          | `core/i18n`                                         | Every user-facing string is a key; see [16-I18N](./16-I18N.md)                          |
| Logging       | `core/observability`                                | Structured JSON, `requestId`/`runId`/`monitorId` in `FiberRef` annotations              |
| Tracing       | `core/observability`                                | OpenTelemetry via `@effect/opentelemetry`, off unless `OTEL_EXPORTER_OTLP_ENDPOINT` set |
| Metrics       | `core/observability`                                | Effect `Metric` → `/metrics` Prometheus endpoint on the API                             |
| Errors        | `core/errors`                                       | Every failure is a tagged error carrying data, never prose                              |
| Secrets       | `core/config` + `server/modules/notifications`      | `Config.redacted`; channel configs AES-256-GCM encrypted at rest                        |
| Rate limiting | `server/modules/jobs`                               | Per-domain BullMQ rate limiter + per-user API limits in Redis                           |
| Time          | `core`                                              | Never `Date.now()` in logic — use Effect `Clock`, so tests use `TestClock`              |
| API contract  | `apps/api` → OpenAPI → `apps/web/src/api/generated` | Generated by Hey API; CI fails on drift ([09-API §3](./09-API.md))                      |

## 6. Scaling and failure posture

- **api** — stateless, N replicas behind the reverse proxy. Sessions live in Postgres, not memory.
- **worker** — stateless, N replicas. Concurrency per replica via `WORKER_CONCURRENCY`.
  BullMQ guarantees a job is delivered to exactly one worker.
- **Redis down** → no jobs execute; API stays up read-only for job creation
  (schedules reconcile on boot from Postgres, which is the source of truth for
  _what should be scheduled_; Redis holds only _execution state_).
- **Postgres down** → API returns 503 via healthcheck; workers fail jobs and retry with backoff.
- **Browser down** → `browser` strategy fails; monitors marked `degraded`; HTTP-strategy monitors unaffected.
- **Reconciliation** — a `maintenance` job runs hourly and re-syncs BullMQ schedulers
  with the `monitors` table, healing drift caused by Redis loss or a partial deploy.
