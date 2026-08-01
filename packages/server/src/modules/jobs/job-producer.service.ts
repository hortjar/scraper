import { AppConfig } from "@scraper/core/config"
import {
  JOB_NAME,
  MAINTENANCE_TASK,
  QUEUE,
  SCHEDULER_ID,
  SERVICE_TAG,
  SPAN,
  type MaintenanceTask,
} from "@scraper/core/constants"
import type { MonitorId, RuleId } from "@scraper/core/domain"
import { QueueUnavailable } from "@scraper/core/errors"
import { Effect } from "effect"

import {
  DIGEST_JOB_RETENTION,
  DIGEST_MAX_ATTEMPTS,
  MAINTENANCE_BACKOFF_MS,
  MAINTENANCE_JOB_RETENTION,
  MAINTENANCE_MAX_ATTEMPTS,
  MAINTENANCE_SCHEDULE,
  MAINTENANCE_SCHEDULE_TZ,
  NOTIFY_JOB_RETENTION,
  NOTIFY_MAX_ATTEMPTS,
  SCRAPE_JOB_RETENTION,
} from "./jobs.constants.js"
import type {
  DigestJobPayload,
  MaintenanceJobPayload,
  NotifyJobPayload,
  ScrapeJobPayload,
} from "./jobs.schema.js"
import { QueueRegistry } from "./queue-registry.service.js"
import {
  buildDigestSchedulerPlan,
  buildScrapeSchedulerPlan,
  type DigestScheduleInput,
  type MonitorScheduleInput,
} from "./schedule-plan.js"

const asQueueUnavailable = (queue: string) => (cause: unknown) =>
  new QueueUnavailable({ queue, cause })

export class JobProducer extends Effect.Service<JobProducer>()(SERVICE_TAG.JobProducer, {
  effect: Effect.gen(function* () {
    const queues = yield* QueueRegistry
    const config = yield* AppConfig

    const removeScheduleById = (id: string) =>
      Effect.tryPromise({
        try: () => queues.scrape.removeJobScheduler(id),
        catch: asQueueUnavailable(QUEUE.scrape),
      })

    const upsertSchedule = Effect.fn(SPAN.jobs.upsertSchedule)(function* (
      monitor: MonitorScheduleInput,
    ) {
      const schedulerId = SCHEDULER_ID.monitor(monitor.id)

      if (!monitor.enabled || monitor.archivedAt !== null) {
        yield* removeScheduleById(schedulerId)
        return
      }

      const plan = buildScrapeSchedulerPlan(monitor, {
        scrapeMaxAttempts: config.redis.scrapeMaxAttempts,
        backoffBaseMs: config.redis.backoffBaseMs,
      })

      yield* Effect.tryPromise({
        try: () =>
          queues.scrape.upsertJobScheduler(plan.id, plan.repeat, {
            name: plan.name,
            data: plan.data,
            opts: plan.opts,
          }),
        catch: asQueueUnavailable(QUEUE.scrape),
      })
    })

    const removeSchedule = Effect.fn(SPAN.jobProducer.removeSchedule)(function* (
      monitorId: MonitorId,
    ) {
      yield* removeScheduleById(SCHEDULER_ID.monitor(monitorId))
    })

    const removeDigestScheduleById = (id: string) =>
      Effect.tryPromise({
        try: () => queues.digest.removeJobScheduler(id),
        catch: asQueueUnavailable(QUEUE.digest),
      })

    const upsertDigestSchedule = Effect.fn(SPAN.jobProducer.upsertDigestSchedule)(function* (
      rule: DigestScheduleInput,
    ) {
      const schedulerId = SCHEDULER_ID.digestRule(rule.id)

      if (!rule.enabled || rule.digestCron === null) {
        yield* removeDigestScheduleById(schedulerId)
        return
      }

      const plan = buildDigestSchedulerPlan(
        { id: rule.id, digestCron: rule.digestCron, timezone: rule.timezone },
        config.redis.backoffBaseMs,
      )

      yield* Effect.tryPromise({
        try: () =>
          queues.digest.upsertJobScheduler(plan.id, plan.repeat, {
            name: plan.name,
            data: plan.data,
            opts: plan.opts,
          }),
        catch: asQueueUnavailable(QUEUE.digest),
      })
    })

    const removeDigestSchedule = Effect.fn(SPAN.jobProducer.removeDigestSchedule)(function* (
      ruleId: RuleId,
    ) {
      yield* removeDigestScheduleById(SCHEDULER_ID.digestRule(ruleId))
    })

    const enqueueScrape = Effect.fn(SPAN.jobProducer.enqueueScrape)(function* (
      payload: ScrapeJobPayload,
    ) {
      yield* Effect.tryPromise({
        try: () =>
          queues.scrape.add(JOB_NAME.scrape, payload, {
            attempts: config.redis.scrapeMaxAttempts,
            backoff: { type: "exponential", delay: config.redis.backoffBaseMs },
            removeOnComplete: SCRAPE_JOB_RETENTION.removeOnComplete,
            removeOnFail: SCRAPE_JOB_RETENTION.removeOnFail,
          }),
        catch: asQueueUnavailable(QUEUE.scrape),
      })
    })

    const enqueueNotify = Effect.fn(SPAN.jobProducer.enqueueNotify)(function* (
      payload: NotifyJobPayload,
    ) {
      yield* Effect.tryPromise({
        try: () =>
          queues.notify.add(JOB_NAME.notify, payload, {
            attempts: NOTIFY_MAX_ATTEMPTS,
            backoff: { type: "exponential", delay: config.redis.backoffBaseMs },
            removeOnComplete: NOTIFY_JOB_RETENTION.removeOnComplete,
            removeOnFail: NOTIFY_JOB_RETENTION.removeOnFail,
          }),
        catch: asQueueUnavailable(QUEUE.notify),
      })
    })

    const enqueueDigest = Effect.fn(SPAN.jobProducer.enqueueDigest)(function* (
      payload: DigestJobPayload,
    ) {
      yield* Effect.tryPromise({
        try: () =>
          queues.digest.add(JOB_NAME.digest, payload, {
            attempts: DIGEST_MAX_ATTEMPTS,
            backoff: { type: "exponential", delay: config.redis.backoffBaseMs },
            removeOnComplete: DIGEST_JOB_RETENTION.removeOnComplete,
            removeOnFail: DIGEST_JOB_RETENTION.removeOnFail,
          }),
        catch: asQueueUnavailable(QUEUE.digest),
      })
    })

    const enqueueMaintenance = Effect.fn(SPAN.jobProducer.enqueueMaintenance)(function* (
      payload: MaintenanceJobPayload,
    ) {
      yield* Effect.tryPromise({
        try: () =>
          queues.maintenance.add(payload.task, payload, {
            attempts: MAINTENANCE_MAX_ATTEMPTS,
            backoff: { type: "fixed", delay: MAINTENANCE_BACKOFF_MS },
            removeOnComplete: MAINTENANCE_JOB_RETENTION.removeOnComplete,
            removeOnFail: MAINTENANCE_JOB_RETENTION.removeOnFail,
          }),
        catch: asQueueUnavailable(QUEUE.maintenance),
      })
    })

    const maintenanceTasks = Object.values(MAINTENANCE_TASK) as MaintenanceTask[]

    const ensureMaintenanceSchedules = Effect.fn(SPAN.jobProducer.ensureMaintenanceSchedules)(
      function* () {
        for (const task of maintenanceTasks) {
          const schedule = MAINTENANCE_SCHEDULE[task]
          const repeat =
            "pattern" in schedule
              ? { pattern: schedule.pattern, tz: MAINTENANCE_SCHEDULE_TZ }
              : { every: schedule.every }

          yield* Effect.tryPromise({
            try: () =>
              queues.maintenance.upsertJobScheduler(SCHEDULER_ID.maintenance(task), repeat, {
                name: task,
                data: { task },
                opts: {
                  attempts: MAINTENANCE_MAX_ATTEMPTS,
                  backoff: { type: "fixed", delay: MAINTENANCE_BACKOFF_MS },
                  removeOnComplete: MAINTENANCE_JOB_RETENTION.removeOnComplete,
                  removeOnFail: MAINTENANCE_JOB_RETENTION.removeOnFail,
                },
              }),
            catch: asQueueUnavailable(QUEUE.maintenance),
          })
        }
      },
    )

    return {
      upsertSchedule,
      removeSchedule,
      enqueueScrape,
      enqueueNotify,
      enqueueDigest,
      upsertDigestSchedule,
      removeDigestSchedule,
      enqueueMaintenance,
      ensureMaintenanceSchedules,
    } as const
  }),
  dependencies: [QueueRegistry.Default, AppConfig.Default],
}) {}
