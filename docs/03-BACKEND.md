# Backend Conventions — Elysia + Effect

Target: Bun 1.2+, Elysia 1.4, Effect 3.22, Drizzle 0.45.

Three packages carry the backend. Feature work happens in **modules**, not in new
packages — see [01-ARCHITECTURE §3](./01-ARCHITECTURE.md).

```
packages/core     domain models, errors, constants, config, i18n, observability
packages/db       drizzle schema, migrations, repositories
packages/server   feature modules — this is where features live
apps/api          composition root (HTTP)
apps/worker       composition root (jobs)
```

## 1. Anatomy of a feature module

```
packages/server/src/modules/monitors/
├── monitors.constants.ts   module-local constants (see §3)
├── monitors.errors.ts      tagged errors specific to this module
├── monitors.schema.ts      Effect Schemas: inputs, outputs, DTOs
├── monitors.repository.ts  DB access, returns domain types
├── monitors.service.ts     Effect.Service — the module's public API
├── monitors.routes.ts      Elysia plugin, thin
├── monitors.messages.ts    i18n message keys this module owns (see §4)
├── index.ts                the module contract: Service, Layer, routes, schemas
├── README.md               what it owns, how to extend it
└── *.test.ts               colocated
```

`index.ts` is the module's contract. Importing anything else from another module
(`../monitors/monitors.repository`) is a lint error. Modules are as isolated as
packages were — without fourteen `package.json` files to maintain.

A file that passes 300 lines splits. A module that passes ~8 files is two modules.

## 2. Services

Use `Effect.Service` — it generates the tag, the accessor, and the layer.

```ts
export class Monitors extends Effect.Service<Monitors>()(SERVICE_TAG.Monitors, {
  effect: Effect.gen(function* () {
    const repo = yield* MonitorRepository
    const jobs = yield* JobProducer

    const create = Effect.fn(SPAN.monitors.create)(function* (
      userId: UserId,
      input: CreateMonitorInput,
    ) {
      yield* assertWithinPlanLimits(userId)
      const url = yield* NormalizedUrl.make(input.url) // fails: InvalidUrl | BlockedHost
      const monitor = yield* repo.insert({ ...input, userId, url })
      yield* jobs.upsertSchedule(monitor) // idempotent
      return monitor
    })

    return { create, update, remove, findById, list } as const
  }),
  dependencies: [MonitorRepository.Default, JobProducer.Default],
}) {}
```

Rules:

- **`Effect.fn(SPAN.x.y)` for every method.** Free trace spans, and stack traces
  point at the call site instead of generator internals.
- Return a `const` object of functions — never a class instance.
- Dependencies are `yield*`-ed at construction, not inside methods.
- A service method never touches `process.env`, `Date.now()`, `Math.random()`, or
  `console`. Use `AppConfig`, `Clock`, `Random`, and `Effect.log*`.
- The error channel is **explicit and narrow**. `Effect<Monitor, MonitorNotFound | DbError>`
  is the documentation.

## 3. Constants — no magic strings

> **Rule: a string literal that appears twice, or that crosses a module boundary,
> is a constant.** Inline literals are for one-off local values only.

Shared constants live in `packages/core/src/constants/`, each file exporting a
frozen object plus its derived union type:

```ts
// core/src/constants/queues.ts
export const QUEUE = {
  scrape: "scrape",
  notify: "notify",
  digest: "digest",
  maintenance: "maintenance",
} as const
export type QueueName = (typeof QUEUE)[keyof typeof QUEUE]

// core/src/constants/redis-keys.ts — key builders, never inline template strings
export const REDIS_KEY = {
  domainRateLimit: (host: string) => `${KEY_PREFIX.rateLimit}:domain:${host}` as const,
  notifyDedupe: (ruleId: RuleId, hash: string) => `${KEY_PREFIX.dedupe}:${ruleId}:${hash}` as const,
  digestBucket: (ruleId: RuleId) => `${KEY_PREFIX.digest}:${ruleId}` as const,
} as const
```

| File              | Holds                                                                   |
| ----------------- | ----------------------------------------------------------------------- |
| `service-tags.ts` | `SERVICE_TAG` — every Effect service tag (`app/Monitors`, …)            |
| `queues.ts`       | `QUEUE`, `JOB_NAME`                                                     |
| `error-codes.ts`  | `ERROR_CODE` — the wire `code` values, single source for API + client   |
| `channels.ts`     | `CHANNEL_KIND` — `email`, `webhook`, `slack`, …                         |
| `http.ts`         | `HEADER`, `COOKIE`, `HTTP_STATUS`, `CONTENT_TYPE`                       |
| `redis-keys.ts`   | `KEY_PREFIX` + `REDIS_KEY` builders                                     |
| `telemetry.ts`    | `SPAN`, `METRIC`, `LOG_FIELD`                                           |
| `audit.ts`        | `AUDIT_ACTION`                                                          |
| `defaults.ts`     | Non-configurable defaults (retry counts, page sizes, truncation limits) |
| `regex.ts`        | Named patterns — never an inline regex used twice                       |

Module-local constants (an internal state machine's states, a module's cache TTLs)
live in `<module>.constants.ts` and are **not** exported from `index.ts` unless
another module genuinely needs them.

Why this matters beyond tidiness: `QUEUE.scrape` renamed in one place is a
compile-time sweep; `'scrape'` typo'd in a worker registration is a queue that
silently never consumes. Every one of the categories above has that failure shape.

## 4. Errors and user-facing messages

Every expected failure is a `Data.TaggedError` in `core/src/errors/`:

```ts
export class MonitorNotFound extends Data.TaggedError("MonitorNotFound")<{ id: MonitorId }> {}
export class NotAuthorized extends Data.TaggedError("NotAuthorized")<{ action: string }> {}
export class ValidationFailed extends Data.TaggedError("ValidationFailed")<{ issues: Issue[] }> {}
export class RateLimited extends Data.TaggedError("RateLimited")<{ retryAfterSeconds: number }> {}
export class ScrapeFailed extends Data.TaggedError("ScrapeFailed")<{
  reason: ScrapeFailureReason
  retryable: boolean
}> {}
```

**Errors carry data, never prose.** A tagged error holds the ids and numbers; the
sentence a human reads is produced by the i18n layer at the edge, in that user's
locale. No English string is ever hardcoded in a service.

HTTP mapping lives in exactly one exhaustive matcher:

| Tag                         | Status | `code`                                     | Message key                |
| --------------------------- | ------ | ------------------------------------------ | -------------------------- |
| `ValidationFailed`          | 422    | `ERROR_CODE.validationFailed`              | `errors.validationFailed`  |
| `Unauthenticated`           | 401    | `ERROR_CODE.unauthenticated`               | `errors.unauthenticated`   |
| `NotAuthorized`             | 403    | `ERROR_CODE.forbidden`                     | `errors.forbidden`         |
| `*NotFound`                 | 404    | `ERROR_CODE.notFound`                      | `errors.monitorNotFound`   |
| `Conflict`, `DuplicateName` | 409    | `ERROR_CODE.conflict`                      | `errors.conflict`          |
| `PlanLimitExceeded`         | 402    | `ERROR_CODE.planLimitExceeded`             | `errors.planLimitExceeded` |
| `RateLimited`               | 429    | `ERROR_CODE.rateLimited` (+ `Retry-After`) | `errors.rateLimited`       |
| `DbError`, unmatched defect | 500    | `ERROR_CODE.internalError`                 | `errors.internalError`     |

```ts
const toHttpError = Match.type<AppError>().pipe(
  Match.tag("MonitorNotFound", (e) =>
    httpError(HTTP_STATUS.notFound, ERROR_CODE.notFound, MSG.errors.monitorNotFound, { id: e.id }),
  ),
  /* … */
  Match.exhaustive, // ← a new error tag without a mapping breaks the build
)
```

Never `Effect.catchAll(() => Effect.succeed(null))`. If a failure is genuinely
ignorable, say so with `Effect.catchTag('X', () => …)` and record why in the module README.

### Backend i18n in one paragraph

`packages/core/src/i18n` exports a `Translator` Effect service, message keys as a
typed `MSG` tree, and ICU catalogs per locale. The API resolves a locale from
`user.locale` → `Accept-Language` → `DEFAULT_LOCALE`, and the error/response
serializer renders `message` from `messageKey` + `params`. Notification templates
and emails resolve against the _recipient's_ locale, not the request's. Full rules
and the key-naming convention: [16-I18N](./16-I18N.md).

## 5. Routes

Routes validate, authorize, call one service method, and shape the response.
Business logic in a route handler is a review-blocking defect.

```ts
export const monitorRoutes = new Elysia({ prefix: ROUTE.monitors, tags: [API_TAG.monitors] })
  .use(effectPlugin)
  .use(requireUser) // macro from the auth module
  .get("/", ({ runFx, user, query }) => runFx(Monitors.list(user.id, query)), {
    query: ListMonitorsQuery, // Effect Schema — Standard Schema
    response: { 200: MonitorPage },
    detail: { summary: "List monitors", operationId: "listMonitors" },
  })
  .post(
    "/",
    ({ runFx, user, body, set }) => {
      set.status = HTTP_STATUS.created
      return runFx(Monitors.create(user.id, body))
    },
    {
      body: CreateMonitorBody,
      response: { 201: MonitorDto },
      detail: { summary: "Create a monitor", operationId: "createMonitor" },
    },
  )
```

- **Effect Schema is the one schema language**, but it must be wrapped:

  ```ts
  import { Schema } from "effect"
  const MonitorPage = Schema.standardSchemaV1(MonitorPageSchema)
  ```

  A bare `Schema.Struct(...)` does **not** carry the `~standard` property that
  Elysia's validator looks for, so it is silently ignored. `Schema.standardSchemaV1`
  stamps `vendor: "effect"` while preserving `.ast`, which is what
  `mapJsonSchema: { effect: JSONSchema.make }` needs to emit real JSON Schema
  (required fields, enums, `additionalProperties: false`). Verified end to end —
  see [09-API §3](./09-API.md).

- **`response` schemas and `operationId` are mandatory on every route.** They are
  not documentation niceties — the frontend's entire API layer is generated from
  this OpenAPI document by Hey API. A missing `response` schema produces an
  untyped client method; a missing `operationId` produces a garbage function name.
  See [09-API §3](./09-API.md).
- Route paths come from the `ROUTE` constant map, tags from `API_TAG`.
- Elysia's plugin dedupe requires a stable `name` on shared plugins.

## 6. Elysia specifics worth knowing

- **Method chaining is mandatory.** `app.use(x)` without reassignment loses types.
- **Plugin `name` + `seed`** control instance dedupe; shared plugins (auth, effect,
  observability) must set `name`.
- **Macros** are how cross-cutting request concerns get typed context. `requireUser`
  resolves the session and injects `user`, so handlers see a non-nullable `user`.
- **Lifecycle hooks are scoped** to the instance unless `.as('global')`. Prefer
  scoped; reach for global only in the composition root.

## 7. Worker conventions

```ts
// apps/worker/src/main.ts
const runtime = ManagedRuntime.make(WorkerLayer)

const scrapeWorker = new Worker(
  QUEUE.scrape,
  async (job) => {
    const payload = Schema.decodeUnknownSync(ScrapeJob)(job.data)
    return runtime.runPromise(
      RunScrape.execute(payload).pipe(
        Effect.annotateLogs({
          [LOG_FIELD.jobId]: job.id,
          [LOG_FIELD.monitorId]: payload.monitorId,
        }),
        Effect.withSpan(SPAN.job.scrape),
      ),
    )
  },
  { connection, concurrency: config.workerConcurrency },
)
```

- Job payloads are **decoded, never trusted** — they may be days old and predate a deploy.
- A job handler is a thin adapter over one Effect use case, same as an HTTP route.
- Retryable vs terminal is a property of the tagged error (`ScrapeFailed.retryable`),
  not of the catch site. Terminal failures throw `UnrecoverableError` so BullMQ stops retrying.
- Every handler is idempotent — see [07-SCHEDULING §5](./07-SCHEDULING.md).

## 8. Testing

- Services are tested against **in-memory layer stubs**, not mocks: provide
  `MonitorRepository.Test` and assert on behavior.
- `TestClock` for anything time-dependent (throttles, quiet hours, digests).
- Repositories and routes are tested against a real Postgres via Testcontainers.
- `@effect/vitest` (`it.effect`) so tests are Effects with typed requirements.
- See [14-TESTING](./14-TESTING.md).

## 9. Style checklist

- `readonly` on every interface field; `as const` on returned objects.
- Named exports only. No default exports outside Vite entrypoints.
- Files ≤ 300 lines. Functions ≤ 50. Nesting ≤ 3.
- No `any`. `unknown` + a decoder at boundaries.
- No magic strings (§3), no magic numbers — both become named constants.
- No hardcoded user-facing prose (§4).
- **No comments of any kind** — no inline comments, no TSDoc, no banners. Names and
  types carry the meaning; prose lives in the module `README.md` and in `docs/`.
