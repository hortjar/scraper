# @scraper/worker

Bun + BullMQ consumers. Composition root for the job side of the backend — see
[docs/07-SCHEDULING.md](../../docs/07-SCHEDULING.md) for the queue contract this
app implements and
[packages/server/src/modules/jobs/README.md](../../packages/server/src/modules/jobs/README.md)
for the module it wires up.

## Layout

```
src/
  runtime.ts        its own ManagedRuntime: config, logger, translator, Database,
                      RedisClient, QueueRegistry, RateLimiter, JobProducer, and
                      the ScrapeRunner/NotifyRunner handler layers
  connection.ts      the raw ioredis connection BullMQ's Worker instances use,
                      built from AppConfig with the same connection options the
                      jobs module's RedisClient uses (imported from there — one
                      source of truth, not two copies)
  schemas.ts         re-exports the job payload Effect Schemas from
                      @scraper/server/modules/jobs — this app does not define them
  heartbeat.ts       writes REDIS_KEY.workerHeartbeat on an interval
  main.ts            boots every worker, ensures maintenance schedules exist,
                      starts the heartbeat, graceful shutdown
  workers/
    worker-factory.ts             shared BullMQ Worker construction: decode →
                                    run the handler Effect → classify the failure
                                    (defer / terminal / retry)
    queue-defaults.constants.ts   concurrency for queues AppConfig doesn't expose
    scrape.worker.ts, notify.worker.ts, digest.worker.ts, maintenance.worker.ts
scripts/
  healthcheck.ts     container HEALTHCHECK probe — see "Liveness" below
```

One file per entry in `QUEUE` (`@scraper/core/constants`). `scrape` and `notify`
resolve their handler from `ScrapeRunner` / `NotifyRunner` (Effect Service tags
owned by the jobs module — see its README for why this is a tag-based seam rather
than a direct import of `runs`/`notifications`, which don't exist yet). `digest`
and `maintenance` call real jobs-module handlers directly
(`flushDigest`, `runMaintenanceTask`) — no seam needed, since the jobs module owns
both end to end.

## Payload decoding is not optional

`createQueueWorker` runs `Schema.decodeUnknownEither` on `job.data` before the
handler ever sees it. A job can be days old and predate a deploy — see
[docs/03-BACKEND.md §7](../../docs/03-BACKEND.md). A decode failure throws
BullMQ's `UnrecoverableError` with the formatted parse issue: retrying a
malformed payload can never succeed, so it must not consume retry budget.

## Failure classification

After the handler Effect runs, `worker-factory.ts` inspects the failure (if any):

1. A `RateLimited` failure (the existing core error, reused rather than inventing
   a new one — see the jobs module README) is **deferred, not failed**:
   `job.moveToDelayed(now + retryAfterSeconds * 1000, token)`, increment
   `METRIC.rateLimitDeferred{host}`, then throw BullMQ's `DelayedError` so it
   doesn't count as a completion or a failure.
2. Otherwise `isRetryableFailure` (from the jobs module) decides: known-transient
   infra errors (`DatabaseError`, `QueueUnavailable`) or anything with an explicit
   `retryable: true` field are rethrown normally, so BullMQ retries per the job's
   `attempts`/`backoff`. Everything else — including any error tag this worker
   doesn't recognize — throws `UnrecoverableError`: an unknown failure retried
   forever is worse than one that surfaces immediately.

Every job, successful or not, calls `recordQueueFire(queue)` once it's decoded —
that's what `maintenance`'s `scheduler-health` task reads to report
`METRIC.schedulerLastFireAge` per queue.

## Concurrency

`scrape` and `notify` read `WORKER_CONCURRENCY` / `NOTIFY_CONCURRENCY` from
`AppConfig` (`redisConfig.workerConcurrency` / `.notifyConcurrency`). `digest`
and `maintenance` have no corresponding env var in `core/config` yet — their
concurrency (5 and 1, per [docs/07-SCHEDULING.md §1](../../docs/07-SCHEDULING.md))
lives in `workers/queue-defaults.constants.ts` until they get a config knob.

## Liveness

Two independent signals, deliberately not the same thing:

- **Worker process alive** — `heartbeat.ts` writes
  `REDIS_KEY.workerHeartbeat(workerId)` with a TTL, every 15s, starting
  immediately at boot. `workerId` is `os.hostname()`, not a random id: Docker
  gives each container a stable hostname for its lifetime, so
  `scripts/healthcheck.ts` — a **separate process**, run by the container
  runtime's `HEALTHCHECK` — can compute the exact same Redis key independently
  and check it, without any file or IPC to share the id across processes.
- **Scheduler infrastructure alive** — the `maintenance` queue's `heartbeat` task
  (a real BullMQ job, not this interval) reports `METRIC.schedulerLastFireAge`
  per queue. See the jobs module README.

`scripts/healthcheck.ts` connects to Redis directly (it's a script, so `process.env`
is allowed there per `AGENTS.md` §3), reads the heartbeat key for its own
hostname, and exits 0/1. It mirrors `apps/api/scripts/healthcheck.ts`'s shape
(an HTTP `/ready` fetch there; a Redis `GET` here, since the worker has no HTTP
surface).

**`deploy/Dockerfile.worker` still needs its `HEALTHCHECK` restored** — it was
removed when nothing existed to probe. This stream does not own `deploy/**`
([docs/12-AGENT-WORKSTREAMS.md](../../docs/12-AGENT-WORKSTREAMS.md)), so the
exact lines needed (mirroring `Dockerfile.api`) are recorded here for whoever
does:

```dockerfile
COPY --from=deploy /app .
COPY apps/worker/scripts/healthcheck.ts ./healthcheck.ts
...
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD bun run healthcheck.ts || exit 1
```

## `process` in an entry file

Same situation as `apps/api`: `no-restricted-globals` bans `process` outside
`packages/core/src/config` and `**/scripts/**`, but `main.ts` needs
`process.on('SIGTERM', …)` / `process.exit(0)` for graceful shutdown, and
`scripts/healthcheck.ts` needs `process.env`/`process.exit`. `main.ts` imports
`process` explicitly from `node:process`, which the rule permits.

## Graceful shutdown

`SIGTERM`/`SIGINT` → stop the heartbeat interval → `worker.close()` on all four
workers in parallel (BullMQ finishes active jobs, takes no new ones) →
disconnect the shared ioredis connection → `runtime.dispose()` (releases the DB
pool and the jobs module's Redis/queue connections) → `process.exit(0)`. See
[docs/10-DEPLOYMENT.md §5](../../docs/10-DEPLOYMENT.md).

## Local development

```bash
docker compose -f ../../deploy/docker-compose.dev.yml up -d redis
APP_URL=http://localhost:9300 \
DATABASE_URL=postgres://scraper:scraper@localhost:9302/scraper \
REDIS_URL=redis://localhost:9303 \
ENCRYPTION_KEY=dev-encryption-key \
SESSION_SECRET=dev-session-secret \
MAIL_FROM=noreply@example.com \
bun run src/main.ts
```
