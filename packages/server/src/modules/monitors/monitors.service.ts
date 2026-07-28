import { AppConfig } from "@scraper/core/config"
import { SCHEDULE_KIND, SERVICE_TAG, SPAN } from "@scraper/core/constants"
import type { Extractor, MonitorConfig, MonitorId, Schedule, UserId } from "@scraper/core/domain"
import { PlanLimitExceeded, ValidationFailed } from "@scraper/core/errors"
import { MSG } from "@scraper/core/i18n"
import { Clock, Effect } from "effect"

import { JobProducer } from "../jobs/index.js"
import { previewScrape, UrlGuard } from "../scraping/index.js"

import {
  DEFAULT_JITTER_SECONDS,
  DUPLICATE_NAME_SUFFIX,
  PREVIEW_MONITOR_ID,
} from "./monitors.constants.js"
import { MonitorRepository } from "./monitors.repository.js"
import type {
  CreateMonitorBody,
  ExtractorInput,
  PreviewMonitorBody,
  UpdateMonitorBody,
} from "./monitors.schema.js"

const SCHEDULE_PATH = ["schedule", "intervalSeconds"] as const

export const toExtractorInput = (extractor: Extractor): ExtractorInput => ({
  key: extractor.key,
  label: extractor.label,
  selectorKind: extractor.selectorKind,
  selector: extractor.selector,
  attribute: extractor.attribute,
  valueType: extractor.valueType,
  transforms: extractor.transforms,
  occurrence: extractor.occurrence,
  occurrenceIndex: extractor.occurrenceIndex,
  required: extractor.required,
})

const toPreviewExtractor = (input: ExtractorInput, position: number): Extractor => ({
  id: PREVIEW_MONITOR_ID as Extractor["id"],
  monitorId: PREVIEW_MONITOR_ID as MonitorId,
  key: input.key,
  label: input.label,
  selectorKind: input.selectorKind,
  selector: input.selector,
  attribute: input.attribute,
  valueType: input.valueType,
  transforms: input.transforms,
  occurrence: input.occurrence,
  occurrenceIndex: input.occurrenceIndex,
  required: input.required,
  position,
})

export const toPreviewConfig = (input: PreviewMonitorBody): MonitorConfig => ({
  id: PREVIEW_MONITOR_ID as MonitorId,
  url: input.url,
  engine: input.engine,
  engineResolved: null,
  request: input.request,
  browserOptions: input.browserOptions,
  contentSelector: input.contentSelector,
  ignoreRules: input.ignoreRules,
  respectRobots: input.respectRobots,
  extractors: input.extractors.map((extractor, index) => toPreviewExtractor(extractor, index)),
})
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

    const setEnabled = Effect.fn(SPAN.monitors.update)(function* (
      userId: UserId,
      id: MonitorId,
      isEnabled: boolean,
    ) {
      yield* repository.findById(userId, id)
      const now = new Date(yield* Clock.currentTimeMillis)
      const monitor = yield* repository.update(userId, id, { enabled: isEnabled, updatedAt: now })
      yield* jobs.upsertSchedule(monitor)
      return yield* detail(userId, id)
    })

    const duplicate = Effect.fn(SPAN.monitors.create)(function* (userId: UserId, id: MonitorId) {
      const source = yield* detail(userId, id)
      yield* assertWithinPlan(userId)

      const copy = yield* repository.insert(userId, {
        name: `${source.monitor.name}${DUPLICATE_NAME_SUFFIX}`,
        url: source.monitor.url,
        engine: source.monitor.engine,
        request: source.monitor.request,
        browserOptions: source.monitor.browserOptions,
        contentSelector: source.monitor.contentSelector,
        ignoreRules: [...source.monitor.ignoreRules],
        respectRobots: source.monitor.respectRobots,
        jitterSeconds: source.monitor.jitterSeconds,
        enabled: false,
        tags: [...source.monitor.tags],
        ...scheduleColumns(source.monitor.schedule),
      })

      yield* repository.replaceExtractors(
        copy.id,
        source.extractors.map((extractor) => toExtractorInput(extractor)),
      )
      yield* jobs.upsertSchedule(copy)
      return yield* detail(userId, copy.id)
    })

    const preview = Effect.fn(SPAN.monitors.preview)(function* (input: PreviewMonitorBody) {
      yield* urlGuard.check(input.url)
      return yield* previewScrape(toPreviewConfig(input))
    })

    return {
      create,
      update,
      remove,
      list,
      detail,
      setEnabled,
      duplicate,
      preview,
      findById: repository.findById,
    } as const
  }),
  dependencies: [
    MonitorRepository.Default,
    AppConfig.Default,
    UrlGuard.Default,
    JobProducer.Default,
  ],
}) {}

export const MonitorsLive = Monitors.Default
