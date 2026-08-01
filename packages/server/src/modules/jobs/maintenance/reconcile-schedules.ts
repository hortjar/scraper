import { DELIVERY_MODE, QUEUE, SCHEDULE_KIND, SPAN } from "@scraper/core/constants"
import { CronExpression, MonitorId, RuleId, Timezone } from "@scraper/core/domain"
import type { Schedule } from "@scraper/core/domain"
import { QueueUnavailable } from "@scraper/core/errors"
import { Database } from "@scraper/db"
import * as schema from "@scraper/db/schema"
import { eq } from "drizzle-orm"
import { Effect } from "effect"

import { JobProducer } from "../job-producer.service.js"
import { QueueRegistry } from "../queue-registry.service.js"

const MONITOR_SCHEDULER_PREFIX = "monitor:"
const DIGEST_SCHEDULER_PREFIX = "digest:"
const DIGEST_FALLBACK_TIMEZONE = "UTC"

interface MonitorScheduleRow {
  readonly id: string
  readonly enabled: boolean
  readonly archivedAt: Date | null
  readonly jitterSeconds: number
  readonly scheduleKind: string
  readonly scheduleValue: string
  readonly scheduleTimezone: string
}

const toSchedule = (row: MonitorScheduleRow): Schedule =>
  row.scheduleKind === SCHEDULE_KIND.cron
    ? {
        kind: SCHEDULE_KIND.cron,
        expression: CronExpression.make(row.scheduleValue),
        timezone: Timezone.make(row.scheduleTimezone),
      }
    : {
        kind: SCHEDULE_KIND.interval,
        intervalSeconds: Number(row.scheduleValue),
        timezone: Timezone.make(row.scheduleTimezone),
      }

export const reconcileSchedules = Effect.fn(SPAN.maintenance.reconcileSchedules)(function* () {
  const database = yield* Database
  const producer = yield* JobProducer
  const queues = yield* QueueRegistry

  const rows = yield* database.query((database_) =>
    database_
      .select({
        id: schema.monitors.id,
        enabled: schema.monitors.enabled,
        archivedAt: schema.monitors.archivedAt,
        jitterSeconds: schema.monitors.jitterSeconds,
        scheduleKind: schema.monitors.scheduleKind,
        scheduleValue: schema.monitors.scheduleValue,
        scheduleTimezone: schema.monitors.scheduleTimezone,
      })
      .from(schema.monitors)
      .where(eq(schema.monitors.enabled, true)),
  )

  const active = rows.filter((row) => row.archivedAt === null)
  const known = new Set(active.map((row) => `${MONITOR_SCHEDULER_PREFIX}${row.id}`))

  yield* Effect.forEach(
    active,
    (row) =>
      producer.upsertSchedule({
        id: MonitorId.make(row.id),
        enabled: row.enabled,
        archivedAt: row.archivedAt,
        jitterSeconds: row.jitterSeconds,
        schedule: toSchedule(row),
      }),
    { discard: true },
  )

  const schedulers = yield* Effect.tryPromise({
    try: () => queues.scrape.getJobSchedulers(),
    catch: (cause) => new QueueUnavailable({ queue: QUEUE.scrape, cause }),
  })

  yield* reconcileDigests(database, producer, queues)

  const orphaned = schedulers.filter(
    (scheduler) => scheduler.key.startsWith(MONITOR_SCHEDULER_PREFIX) && !known.has(scheduler.key),
  )

  yield* Effect.forEach(
    orphaned,
    (scheduler) =>
      Effect.tryPromise({
        try: () => queues.scrape.removeJobScheduler(scheduler.key),
        catch: (cause) => new QueueUnavailable({ queue: QUEUE.scrape, cause }),
      }),
    { discard: true },
  )
})

interface DigestRuleRow {
  readonly id: string
  readonly enabled: boolean
  readonly deliveryMode: string
  readonly digestCron: string | null
  readonly quietHours: { readonly timezone: string } | null
}

const reconcileDigests = (database: Database, producer: JobProducer, queues: QueueRegistry) =>
  Effect.gen(function* () {
    const rows: readonly DigestRuleRow[] = yield* database.query((database_) =>
      database_
        .select({
          id: schema.notificationRules.id,
          enabled: schema.notificationRules.enabled,
          deliveryMode: schema.notificationRules.deliveryMode,
          digestCron: schema.notificationRules.digestCron,
          quietHours: schema.notificationRules.quietHours,
        })
        .from(schema.notificationRules),
    )

    const digestRules = rows.filter(
      (row) => row.enabled && row.deliveryMode === DELIVERY_MODE.digest && row.digestCron !== null,
    )
    const known = new Set(digestRules.map((row) => `${DIGEST_SCHEDULER_PREFIX}${row.id}`))

    yield* Effect.forEach(
      digestRules,
      (row) =>
        producer.upsertDigestSchedule({
          id: RuleId.make(row.id),
          enabled: true,
          digestCron: row.digestCron,
          timezone: row.quietHours?.timezone ?? DIGEST_FALLBACK_TIMEZONE,
        }),
      { discard: true },
    )

    const schedulers = yield* Effect.tryPromise({
      try: () => queues.digest.getJobSchedulers(),
      catch: (cause) => new QueueUnavailable({ queue: QUEUE.digest, cause }),
    })

    const orphaned = schedulers.filter(
      (scheduler) => scheduler.key.startsWith(DIGEST_SCHEDULER_PREFIX) && !known.has(scheduler.key),
    )

    yield* Effect.forEach(
      orphaned,
      (scheduler) =>
        Effect.tryPromise({
          try: () => queues.digest.removeJobScheduler(scheduler.key),
          catch: (cause) => new QueueUnavailable({ queue: QUEUE.digest, cause }),
        }),
      { discard: true },
    )
  })
