import { JOB_NAME, RUN_TRIGGER, SCHEDULE_KIND, SCHEDULER_ID } from "@scraper/core/constants"
import type { Monitor, MonitorId, Schedule } from "@scraper/core/domain"

import { deterministicJitterMs } from "./jitter.js"
import { SCRAPE_JOB_RETENTION } from "./jobs.constants.js"
import type { ScrapeJobPayload } from "./jobs.schema.js"

export interface ScrapeSchedulerSource {
  readonly id: MonitorId
  readonly jitterSeconds: Monitor["jitterSeconds"]
  readonly schedule: Schedule
}

export interface MonitorScheduleInput extends ScrapeSchedulerSource {
  readonly enabled: boolean
  readonly archivedAt: Date | null
}

export interface ScrapeRepeatSpec {
  readonly pattern?: string
  readonly every?: number
  readonly tz: string
  readonly offset: number
}

export interface ScrapeSchedulerPlan {
  readonly id: string
  readonly repeat: ScrapeRepeatSpec
  readonly name: string
  readonly data: ScrapeJobPayload
  readonly opts: {
    readonly attempts: number
    readonly backoff: { readonly type: "exponential"; readonly delay: number }
    readonly removeOnComplete: (typeof SCRAPE_JOB_RETENTION)["removeOnComplete"]
    readonly removeOnFail: (typeof SCRAPE_JOB_RETENTION)["removeOnFail"]
  }
}

export interface ScrapeSchedulerConfig {
  readonly scrapeMaxAttempts: number
  readonly backoffBaseMs: number
}

export const buildScrapeSchedulerPlan = (
  monitor: ScrapeSchedulerSource,
  config: ScrapeSchedulerConfig,
): ScrapeSchedulerPlan => {
  const offset = deterministicJitterMs(monitor.id, monitor.jitterSeconds)
  const repeat: ScrapeRepeatSpec =
    monitor.schedule.kind === SCHEDULE_KIND.cron
      ? { pattern: monitor.schedule.expression, tz: monitor.schedule.timezone, offset }
      : { every: monitor.schedule.intervalSeconds * 1000, tz: monitor.schedule.timezone, offset }

  return {
    id: SCHEDULER_ID.monitor(monitor.id),
    repeat,
    name: JOB_NAME.scrape,
    data: { monitorId: monitor.id, trigger: RUN_TRIGGER.schedule, attempt: 0 },
    opts: {
      attempts: config.scrapeMaxAttempts,
      backoff: { type: "exponential", delay: config.backoffBaseMs },
      removeOnComplete: SCRAPE_JOB_RETENTION.removeOnComplete,
      removeOnFail: SCRAPE_JOB_RETENTION.removeOnFail,
    },
  }
}
