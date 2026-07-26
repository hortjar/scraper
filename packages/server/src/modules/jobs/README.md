# jobs

BullMQ 5 on Redis 7. Owns queue definitions, the job producer, per-domain rate
limiting, and the six maintenance tasks. Consumed by `apps/worker`. Spec:
[docs/07-SCHEDULING.md](../../../../../docs/07-SCHEDULING.md).

## What this module owns

- `redis-client.service.ts` — `RedisClient` (`SERVICE_TAG.RedisClient`): the one
  ioredis connection this module uses for its own reads/writes (rate-limit sliding
  window, scheduler-last-fire heartbeat, robots-cache pruning). It also hands its
  raw `client` to `QueueRegistry` so BullMQ's `Queue` instances share the same
  connection instead of opening a second one. `apps/worker`'s own `Worker`
  instances use a **separate** raw connection built in `apps/worker/src/connection.ts`
  — BullMQ recommends workers and producers not share a connection, and it keeps
  the two lifecycles independent.
- `queue-registry.service.ts` — `QueueRegistry` (`SERVICE_TAG.QueueRegistry`): the
  four `Queue` instances (`scrape`, `notify`, `digest`, `maintenance`), scoped so
  they close on shutdown.
- `job-producer.service.ts` — `JobProducer` (`SERVICE_TAG.JobProducer`):
  `upsertSchedule` (idempotent via `upsertJobScheduler`), `removeSchedule`, one
  `enqueueX` helper per queue, and `ensureMaintenanceSchedules` (bootstraps the six
  recurring maintenance schedulers once at worker startup).
- `schedule-plan.ts` — the **pure** function that turns a monitor's schedule +
  jitter seconds into a BullMQ repeat spec. Split out from `JobProducer` on purpose:
  it is what "schedule idempotency" actually means (same monitor in → same
  scheduler id, same repeat spec, same jitter, every time) and it needs no Redis to
  test.
- `jitter.ts` — deterministic jitter from an FNV-1a hash of the monitor id, **not**
  `Math.random()`. Stable across restarts; 500 monitors on "every hour" spread
  across the hour instead of a `:00` stampede. BullMQ's `RepeatOptions.offset` is
  used to apply it (its `JobSchedulerTemplateOptions` type excludes `delay`, unlike
  the older sample in 07-SCHEDULING §2 — that doc has been corrected to match).
- `sliding-window.ts` + `rate-limiter.service.ts` — `RateLimiter`
  (`SERVICE_TAG.RateLimiter`, already reserved in core). Per-domain sliding window
  keyed `REDIS_KEY.domainRateLimit(host)`. `checkDomain` fails with the existing
  core `RateLimited` error (never a new type) when the window is full. The ZADD /
  ZREMRANGEBYSCORE / ZCARD sequence is not wrapped in a Lua script, so two workers
  racing on the same host in the same millisecond could both pass — accepted
  trade-off, same spirit as the rest of this system ("at-least-once, safe to run
  twice"), and the cost of getting it wrong is one extra request to a target, not a
  correctness bug.
- `maintenance/` — one file per task in `MAINTENANCE_TASK`, dispatched by
  `run-maintenance-task.ts`. `reconcile-schedules` diffs enabled/non-archived
  monitors against BullMQ's job schedulers (adds missing, removes orphans — heals
  Redis loss). `sweep-runs` reaps runs stuck in `running` past
  `STALE_RUN_TIMEOUT_MS` (a crashed worker leaves no other trace) and prunes
  `runs`/`changes`/`field_values`/`snapshots` past their retention windows.
  `sweep-sessions` deletes expired sessions and consumed/expired verification
  tokens. `refresh-stats` runs `REFRESH MATERIALIZED VIEW CONCURRENTLY
monitor_stats`. `prune-robots` deletes any robots-cache key that somehow has no
  TTL (normal entries expire on their own; this only catches a bug). `heartbeat`
  is wired to `scheduler-health.ts`, **not** the worker liveness heartbeat (see
  below) — it reads every queue's `REDIS_KEY.schedulerLastFire` and reports
  `METRIC.schedulerLastFireAge`, so a scheduler that quietly stops firing is
  alertable instead of silently rotting.
- `record-queue-fire.ts` — called by `apps/worker`'s queue-worker wrapper after
  every job of a given queue is picked up, regardless of outcome. This is what
  `scheduler-health` reads.
- `failure-classification.ts` — `isRetryableFailure`: an unknown tagged error
  defaults to **terminal**, not retryable. Only `DatabaseError` and
  `QueueUnavailable` are retryable without an explicit `retryable` field; anything
  else needs one (`ScrapeFailed.retryable`, `DeliveryFailed.retryable`, …) or it's
  treated as terminal. Conservative on purpose — an unknown failure retried forever
  is worse than one that surfaces immediately.
- `handlers/scrape-runner.service.ts`, `handlers/notify-runner.service.ts` — see
  "Cross-module handoff" below.
- `handlers/digest-flush.ts` — the digest queue's **real** handler, owned entirely
  by this module. It does not call into `notifications` at all: it reads the
  delivery ids a rule's digest window accumulated in
  `REDIS_KEY.digestBucket(ruleId)` (a Redis set, written by whoever suppresses a
  notification into digest mode) and enqueues one `notify` job per id, then clears
  the bucket. Rendering/sending stays behind the `notify` queue's `NotifyRunner`.
  Per-rule digest **cron scheduling** (calling `upsertJobScheduler` on the digest
  queue per `notification_rules.digest_cron`) is out of scope here — see
  [12-AGENT-WORKSTREAMS](../../../../../docs/12-AGENT-WORKSTREAMS.md) stream **K**
  (`server/modules/jobs/{digest,limits,health}`, Phase 2), which owns it. This
  module ships `JobProducer.enqueueDigest` and the queue itself; K wires the cron.

## Cross-module handoff: `ScrapeRunner` / `NotifyRunner`

The `scrape` and `notify` queues need real work done by modules that don't exist
yet (`runs`, `notifications`). Per the task brief for this stream, this module
**defines the interface and ships a logging stub**, and does not import either
module:

```ts
export interface ScrapeRunnerShape {
  readonly execute: (payload: ScrapeJobPayload) => Effect.Effect<void, AppError>
}
export class ScrapeRunner extends Effect.Service<ScrapeRunner>()(SERVICE_TAG.ScrapeRunner, { … }) {}
export const ScrapeRunnerLive = ScrapeRunner.Default // the stub

export interface NotifyRunnerShape {
  readonly execute: (payload: NotifyJobPayload) => Effect.Effect<void, AppError>
}
export class NotifyRunner extends Effect.Service<NotifyRunner>()(SERVICE_TAG.NotifyRunner, { … }) {}
export const NotifyRunnerLive = NotifyRunner.Default // the stub
```

`SERVICE_TAG.ScrapeRunner` already existed (reserved for exactly this handoff per
[12-AGENT-WORKSTREAMS](../../../../../docs/12-AGENT-WORKSTREAMS.md): "E consumes a
`ScrapeRunner` interface that G later implements"). `SERVICE_TAG.NotifyRunner` was
added here for the equivalent notify-side seam — `NotificationDispatcher`
(`SERVICE_TAG.NotificationDispatcher`) is `notifications`' own internal
render→send→receipt pipeline with a different shape; this is deliberately a
separate, narrower tag so `notifications` can wire `NotifyRunner.execute` to call
its own `NotificationDispatcher.dispatch` without the two shapes being coupled.

The interface's shape is pinned by an explicit `ScrapeRunnerShape`/`NotifyRunnerShape`
interface, not inferred from the stub. If it were inferred, the stub's trivial
`Effect<void, never>` return type would become the class's permanent type, and a
real implementation that can fail with `MonitorNotFound` or `ScrapeFailed` would
not type-check against it.

**The injectable registry** is `apps/worker/src/runtime.ts`'s `WorkerLayer`: it
merges `ScrapeRunnerLive` and `NotifyRunnerLive` (the stubs) in today. When `runs`
or `notifications` land, swap the import — `ScrapeRunnerLive` → their real
`Layer.effect(ScrapeRunner, …)` (same tag, imported from this module) — and delete
nothing else. That one-line swap per stream is the "marked insertion point" called
out in `AGENTS.md` §3c.

## Job payload schemas

Canonical in `jobs.schema.ts`, decoded on consumption (job data can be older than
the running code — see `docs/07-SCHEDULING.md` §1). `apps/worker/src/schemas.ts`
used to duplicate these; it now re-exports them from here.

## Worker liveness

Not this module's file, but worth recording the reasoning here since it's the
counterpart to `scheduler-health`: `apps/worker/src/heartbeat.ts` writes
`REDIS_KEY.workerHeartbeat(id)` on an interval — that is the **worker process**
being alive. `maintenance`'s `heartbeat` task / `scheduler-health.ts` is a
different signal — the **BullMQ scheduler infrastructure** being alive (it only
runs if the maintenance queue's own scheduler is still firing). `apps/worker/README.md`
documents the container probe that reads the former.

## Known gaps (out of scope for this stream)

- **Bull Board** (`ENABLE_BULL_BOARD`) is a stream-E deliverable per
  [12-AGENT-WORKSTREAMS](../../../../../docs/12-AGENT-WORKSTREAMS.md), but mounting
  it is an `apps/api` route, which this stream does not own. `QueueRegistry` is the
  seam: `apps/api` can `yield* QueueRegistry` and pass `.scrape`/`.notify`/etc. to
  `@bull-board/api`'s `BullMQAdapter` once that package is added.
- `pnpm jobs:trigger <monitorId>` (docs §9) is not wired up — needs a runnable
  entrypoint that boots just enough of `WorkerLayer` + `JobProducer` to call
  `enqueueScrape`. Left for whoever adds the root script.
- Screenshot files in object storage are not pruned by `sweep-runs` — only the
  `snapshots` row (with its `screenshotRef`) is deleted. Deleting the backing
  object needs `SERVICE_TAG.ObjectStore`, which does not exist yet.
