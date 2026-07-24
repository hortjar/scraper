# Scheduling & Jobs

Module: `packages/server/src/modules/jobs`. BullMQ 5 on Redis 7, consumed by `apps/worker`.

**Source of truth:** Postgres decides *what should be scheduled*; Redis holds
*execution state*. Losing Redis loses in-flight work, never configuration — the
reconciler rebuilds every scheduler from `monitors`.

## 1. Queues

| Queue | Payload | Concurrency | Notes |
|---|---|---|---|
| `scrape` | `{ monitorId, trigger, attempt }` | `WORKER_CONCURRENCY` (default 5) | The hot path. Per-domain rate limited. |
| `notify` | `{ deliveryId }` | 20 | I/O-bound, cheap, high concurrency |
| `digest` | `{ ruleId, windowStart, windowEnd }` | 5 | Cron-triggered per rule |
| `maintenance` | `{ task }` | 1 | Sweeper, reconciler, stats refresh, robots cache prune |

Payload schemas live in `jobs.schema.ts` as Effect Schemas and are
**decoded on consumption**. Job data is untrusted input: it can be older than the
running code.

Queue names are prefixed with `JOB_PREFIX` (default `scraper`) so several
environments can share a Redis instance without collision.

## 2. Scheduling a monitor

BullMQ **Job Schedulers** (the supported API since 5.16; the old `repeat` API is
deprecated):

```ts
const upsertSchedule = Effect.fn('JobProducer.upsertSchedule')(function* (m: Monitor) {
  const id = `monitor:${m.id}`
  if (!m.enabled || m.archivedAt) return yield* removeSchedule(m.id)

  const repeat = m.scheduleKind === 'cron'
    ? { pattern: m.scheduleValue, tz: m.scheduleTimezone }
    : { every: Number(m.scheduleValue) * 1000 }

  yield* Effect.tryPromise(() =>
    queues.scrape.upsertJobScheduler(id, repeat, {
      name: 'scrape',
      data: { monitorId: m.id, trigger: 'schedule' },
      opts: {
        jobId: undefined,                 // let BullMQ generate per-iteration ids
        attempts: SCRAPE_MAX_ATTEMPTS,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 86_400 },
        delay: jitter(m.jitterSeconds),   // deterministic per-monitor, not random
      },
    }))
})
```

- `upsertJobScheduler` is idempotent — safe to call on every monitor update and on
  every reconciliation pass.
- **Jitter** is derived from a hash of the monitor id, not `Math.random()`: stable
  across restarts, and it spreads 500 monitors that all say "every hour" across the
  hour instead of stampeding a target at :00.
- Timezone-aware cron matters: "every day at 08:00" means the user's 08:00, and it
  must survive DST.

## 3. Rate limiting

Two independent limiters, because they protect different things:

1. **Per-target-domain** — a Redis token bucket keyed `rl:domain:<host>`, default
   `DOMAIN_RATE_LIMIT` (1 request / 10s / domain). A job that can't acquire a token
   is re-delayed with `job.moveToDelayed`, not failed. This is politeness, and it
   is what keeps the operator out of trouble when 50 users all monitor the same
   popular site.
2. **Per-worker** — BullMQ's `limiter` caps global throughput so a burst can't
   exhaust browser containers or DB connections.

Plus a **per-user concurrency cap** (`MAX_CONCURRENT_RUNS_PER_USER`) so one user's
200 monitors can't starve everyone else's.

## 4. The scrape job, step by step

```
1. decode payload                              → InvalidJobPayload (terminal)
2. load monitor + extractors + rules           → MonitorNotFound (terminal)
3. guard: enabled, not archived, within limits → skipped run
4. acquire domain rate-limit token             → re-delay
5. robots.txt check (cached)                   → RobotsDisallowed (terminal)
6. insert run row {status: running}
7. resolve strategy → fetch                    → ScrapeFailed (retryable?)
8. normalize + hash
9. if hash unchanged → finish run, done        ← the cheap common path
10. extract fields → persist field_values
11. diff vs previous successful run → changes
12. evaluate rules → notify/digest jobs
13. finish run {status, duration, changed}
14. update monitor status / consecutive_failures
```

Steps 6–13 run inside one transaction per write batch; the notify enqueue happens
**after** commit (a transactional outbox row would be the stricter option, and is a
v2 item — for v1, at-least-once with dedupe is the accepted trade-off, documented here).

## 5. Idempotency & exactly-once-ish

- Run rows are keyed by `job_id` — a redelivered job finds its existing run and
  resumes rather than duplicating.
- Notification dedupe key `(rule_id, message_hash)` with TTL, so a retried job that
  already sent doesn't send twice.
- `changes` are inserted with `ON CONFLICT (run_id, extractor_key, change_kind) DO NOTHING`.
- Handlers assume **at-least-once delivery**. Every side effect is either idempotent
  or guarded by a dedupe key. There is no "exactly once" — there is only "safe to run twice".

## 6. Retries and failure escalation

| Failure | Retryable | Behavior |
|---|---|---|
| Network timeout, DNS, 5xx | yes | exponential backoff, up to `SCRAPE_MAX_ATTEMPTS` (3) |
| 429 | yes | backoff honoring `Retry-After` |
| 403 / challenge page | once | escalate to `browser` strategy, then terminal |
| 404 / 410 | no | monitor → `failing`, user notified via `run_failed` rules |
| Required extractor missing | no | run fails; **never** reported as a change |
| Browser container unreachable | yes | monitor → `degraded`; alert the operator, not the user |

`monitors.consecutive_failures ≥ AUTO_PAUSE_AFTER_FAILURES` (default 20) →
monitor auto-pauses, user is notified once with a "resume" link. A permanently
broken monitor must stop burning resources and stop spamming.

## 7. Maintenance jobs

| Task | Cadence | Does |
|---|---|---|
| `reconcile-schedules` | hourly | Diff `monitors` against BullMQ schedulers; add missing, remove orphans. Heals Redis loss and partial deploys. |
| `sweep-runs` | daily 03:00 | Delete runs/snapshots/field values past retention; drop old partitions |
| `sweep-sessions` | hourly | Delete expired sessions and consumed tokens |
| `refresh-stats` | 5 min | `REFRESH MATERIALIZED VIEW CONCURRENTLY monitor_stats` |
| `prune-robots` | daily | Expire robots.txt cache |
| `digest-flush` | per rule cron | Build and enqueue digest notifications |
| `heartbeat` | 1 min | Writes `worker:<id>:alive`; the API's `/ready` reports stale workers |

**Heartbeats matter.** The classic silent failure of a scheduling system isn't a
crash — it's a scheduler that quietly stops firing. `/metrics` exposes
`scheduler_last_fire_age_seconds` per queue so it's alertable.

## 8. Observability

Metrics: `jobs_processed_total{queue,status}`, `job_duration_seconds{queue}`,
`queue_depth{queue}`, `scrape_bytes_total`, `changes_detected_total`,
`notifications_sent_total{channel,status}`, `rate_limit_deferred_total{host}`.

Every job runs inside a span (`job.scrape`, `job.notify`) with `monitorId`/`runId`
annotations, so one trace covers fetch → extract → diff → notify.

Bull Board is mounted at `/admin/queues` behind admin auth when `ENABLE_BULL_BOARD=true`.

## 9. Local development

`pnpm dev` starts postgres, redis, and the browser container via
`docker-compose.dev.yml`, then runs api/worker/web with hot reload.
`pnpm jobs:trigger <monitorId>` enqueues a one-off scrape so a developer never has
to wait for a cron tick.
