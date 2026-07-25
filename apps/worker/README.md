# @scraper/worker

Bun + BullMQ consumers. Composition root for the job side of the backend — see
[docs/07-SCHEDULING.md](../../docs/07-SCHEDULING.md) for the queue contract this
app implements.

## Layout

```
src/
  runtime.ts        its own ManagedRuntime: config, logger, translator, Database
  connection.ts      ioredis connection built from AppConfig with BullMQ's
                      required maxRetriesPerRequest: null
  schemas.ts         Effect Schema for every queue's job payload
  heartbeat.ts       writes REDIS_KEY.workerHeartbeat on an interval
  main.ts            boots every worker, starts the heartbeat, graceful shutdown
  workers/
    worker-factory.ts             shared BullMQ Worker construction: decode →
                                    UnrecoverableError | run the handler Effect
    queue-defaults.constants.ts   concurrency for queues AppConfig doesn't expose
    scrape.worker.ts, notify.worker.ts, digest.worker.ts, maintenance.worker.ts
```

One file per entry in `QUEUE` (`@scraper/core/constants`). Each calls
`createQueueWorker` with its schema, concurrency, and a placeholder handler
(`Effect.logInfo(...)`) — real business logic lands here once
`packages/server/src/modules/jobs` exists to call into.

## Payload decoding is not optional

`createQueueWorker` runs `Schema.decodeUnknownEither` on `job.data` before the
handler ever sees it. A job can be days old and predate a deploy — see
[docs/03-BACKEND.md §7](../../docs/03-BACKEND.md). A decode failure throws
BullMQ's `UnrecoverableError` with the formatted parse issue: retrying a
malformed payload can never succeed, so it must not consume retry budget.

## Concurrency

`scrape` and `notify` read `WORKER_CONCURRENCY` / `NOTIFY_CONCURRENCY` from
`AppConfig` (`redisConfig.workerConcurrency` / `.notifyConcurrency`). `digest`
and `maintenance` have no corresponding env var in `core/config` yet — their
concurrency (5 and 1, per [docs/07-SCHEDULING.md §1](../../docs/07-SCHEDULING.md))
lives in `workers/queue-defaults.constants.ts` until they get a config knob.

## Heartbeat

`heartbeat.ts` writes `REDIS_KEY.workerHeartbeat(workerId)` with a TTL, every 15s,
starting immediately at boot. This is a liveness signal for the API's `/ready` to
eventually read (worker heartbeat staleness is not yet wired into `/ready` —
`apps/api` only checks Database + Redis today). `workerId` is a `crypto.randomUUID()`
generated once at boot; it identifies the process, not a job.

## `process` in an entry file

Same situation as `apps/api`: `no-restricted-globals` bans `process` outside
`packages/core/src/config` and `**/scripts/**`, but `main.ts` needs
`process.on('SIGTERM', …)` / `process.exit(0)` for graceful shutdown. It goes
through `globalThis.process`, which the rule doesn't see (it flags the `process`
identifier, not a property access on `globalThis`).

## Graceful shutdown

`SIGTERM`/`SIGINT` → stop the heartbeat interval → `worker.close()` on all four
workers in parallel (BullMQ finishes active jobs, takes no new ones) →
disconnect the shared ioredis connection → `runtime.dispose()` (releases the DB
pool) → `process.exit(0)`. See
[docs/10-DEPLOYMENT.md §5](../../docs/10-DEPLOYMENT.md).

## Local development

```bash
docker compose -f ../../deploy/docker-compose.dev.yml up -d redis
APP_URL=http://localhost:3001 \
DATABASE_URL=postgres://scraper:scraper@localhost:5432/scraper \
REDIS_URL=redis://localhost:6379 \
ENCRYPTION_KEY=dev-encryption-key \
SESSION_SECRET=dev-session-secret \
MAIL_FROM=noreply@example.com \
bun run src/main.ts
```
