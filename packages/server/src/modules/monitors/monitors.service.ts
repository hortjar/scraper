import { AppConfig } from "@scraper/core/config"
import { SCHEDULE_KIND, SERVICE_TAG, SPAN } from "@scraper/core/constants"
import type { MonitorId, Schedule, UserId } from "@scraper/core/domain"
import { PlanLimitExceeded, ValidationFailed } from "@scraper/core/errors"
import { MSG } from "@scraper/core/i18n"
import { Clock, Effect } from "effect"

import { JobProducer } from "../jobs/index.js"
import { UrlGuard } from "../scraping/index.js"

import { DEFAULT_JITTER_SECONDS } from "./monitors.constants.js"
import { MonitorRepository } from "./monitors.repository.js"
import type { CreateMonitorBody, UpdateMonitorBody } from "./monitors.schema.js"

const SCHEDULE_PATH = ["schedule", "intervalSeconds"] as const
const MONITOR_RESOURCE = "monitors"

export const scheduleColumns = (schedule: Schedule) =>
  schedule.kind === SCHEDULE_KIND.cron
    ? {
        scheduleKind: SCHEDULE_KIND.cron,
        scheduleValue: schedule.expression,
        scheduleTimezone: schedule.timezone,
      }
    : {
        scheduleKind: SCHEDULE_KIND.interval,
        scheduleValue: String(schedule.intervalSeconds),
        scheduleTimezone: schedule.timezone,
      }

export const assertScheduleWithinFloor = (
  schedule: Schedule,
  minIntervalSeconds: number,
): Effect.Effect<void, ValidationFailed> =>
  schedule.kind === SCHEDULE_KIND.interval && schedule.intervalSeconds < minIntervalSeconds
    ? Effect.fail(
        new ValidationFailed({
          issues: [
            {
              path: SCHEDULE_PATH,
              messageKey: MSG.errors.intervalTooShort,
              params: { minimum: minIntervalSeconds },
            },
          ],
        }),
      )
    : Effect.void

export class Monitors extends Effect.Service<Monitors>()(SERVICE_TAG.Monitors, {
  effect: Effect.gen(function* () {
    const repository = yield* MonitorRepository
    const config = yield* AppConfig
    const urlGuard = yield* UrlGuard
    const jobs = yield* JobProducer

    const minInterval = config.scraping.minIntervalSeconds
    const maxMonitors = config.scraping.maxMonitorsPerUser

    const assertWithinPlan = Effect.fn(SPAN.monitors.create)(function* (userId: UserId) {
      const active = yield* repository.countActive(userId)
      if (active >= maxMonitors) {
        return yield* new PlanLimitExceeded({ limit: maxMonitors, resource: MONITOR_RESOURCE })
      }
    })

    const detail = Effect.fn(SPAN.monitors.findById)(function* (userId: UserId, id: MonitorId) {
      const monitor = yield* repository.findById(userId, id)
      const extractors = yield* repository.listExtractors(id)
      return { monitor, extractors }
    })

    const create = Effect.fn(SPAN.monitors.create)(function* (
      userId: UserId,
      input: CreateMonitorBody,
    ) {
      yield* assertWithinPlan(userId)
      yield* assertScheduleWithinFloor(input.schedule, minInterval)
      yield* urlGuard.check(input.url)

      const monitor = yield* repository.insert(userId, {
        name: input.name,
        url: input.url,
        engine: input.engine,
        request: input.request,
        browserOptions: input.browserOptions,
        contentSelector: input.contentSelector,
        ignoreRules: [...input.ignoreRules],
        respectRobots: input.respectRobots,
        jitterSeconds: input.jitterSeconds ?? DEFAULT_JITTER_SECONDS,
        enabled: input.enabled,
        tags: [...input.tags],
        ...scheduleColumns(input.schedule),
      })

      yield* repository.replaceExtractors(monitor.id, input.extractors)
      yield* jobs.upsertSchedule(monitor)
      return yield* detail(userId, monitor.id)
    })

    const update = Effect.fn(SPAN.monitors.update)(function* (
      userId: UserId,
      id: MonitorId,
      patch: UpdateMonitorBody,
    ) {
      const existing = yield* repository.findById(userId, id)
      if (patch.schedule !== undefined) {
        yield* assertScheduleWithinFloor(patch.schedule, minInterval)
      }
      if (patch.url !== undefined) yield* urlGuard.check(patch.url)

      const now = new Date(yield* Clock.currentTimeMillis)
      const { extractors, schedule, ...rest } = patch
      const values: Record<string, unknown> = { ...rest, updatedAt: now }
      if (schedule !== undefined) Object.assign(values, scheduleColumns(schedule))
      if (rest.ignoreRules !== undefined) values.ignoreRules = [...rest.ignoreRules]
      if (rest.tags !== undefined) values.tags = [...rest.tags]

      const monitor = yield* repository.update(userId, id, values)
      if (extractors !== undefined) yield* repository.replaceExtractors(id, extractors)
      if (schedule !== undefined || patch.enabled !== undefined) {
        yield* jobs.upsertSchedule(monitor)
      }
      return yield* detail(userId, existing.id)
    })

    const remove = Effect.fn(SPAN.monitors.remove)(function* (userId: UserId, id: MonitorId) {
      yield* repository.findById(userId, id)
      const now = new Date(yield* Clock.currentTimeMillis)
      yield* repository.archive(userId, id, now)
      yield* jobs.removeSchedule(id)
    })

    const list = Effect.fn(SPAN.monitors.list)(function* (
      userId: UserId,
      filter: {
        readonly cursor?: string | undefined
        readonly limit: number
        readonly tag?: string | undefined
        readonly search?: string | undefined
      },
    ) {
      return yield* repository.list(userId, filter)
    })

    return { create, update, remove, list, detail, findById: repository.findById } as const
  }),
  dependencies: [
    MonitorRepository.Default,
    AppConfig.Default,
    UrlGuard.Default,
    JobProducer.Default,
  ],
}) {}

export const MonitorsLive = Monitors.Default
