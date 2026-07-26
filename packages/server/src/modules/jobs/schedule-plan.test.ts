import { CronExpression, MonitorId, Timezone } from "@scraper/core/domain"
import { describe, expect, it } from "vitest"

import { buildScrapeSchedulerPlan, type ScrapeSchedulerSource } from "./schedule-plan.js"

const CONFIG = { scrapeMaxAttempts: 3, backoffBaseMs: 30_000 }

const monitorId = (seed: string) => MonitorId.make(seed)

const cronMonitor: ScrapeSchedulerSource = {
  id: monitorId("11111111-1111-1111-1111-111111111111"),
  jitterSeconds: 60,
  schedule: {
    kind: "cron",
    expression: CronExpression.make("0 8 * * *"),
    timezone: Timezone.make("Europe/Prague"),
  },
}

const intervalMonitor: ScrapeSchedulerSource = {
  id: monitorId("22222222-2222-2222-2222-222222222222"),
  jitterSeconds: 30,
  schedule: { kind: "interval", intervalSeconds: 300, timezone: Timezone.make("UTC") },
}

describe("buildScrapeSchedulerPlan", () => {
  it("derives the scheduler id from the monitor id, not a random value", () => {
    const plan = buildScrapeSchedulerPlan(cronMonitor, CONFIG)

    expect(plan.id).toBe(`monitor:${cronMonitor.id}`)
  })

  it("produces an identical plan when called twice for the same monitor", () => {
    const first = buildScrapeSchedulerPlan(cronMonitor, CONFIG)
    const second = buildScrapeSchedulerPlan(cronMonitor, CONFIG)

    expect(second).toEqual(first)
  })

  it("carries the cron pattern and timezone for cron-scheduled monitors", () => {
    const plan = buildScrapeSchedulerPlan(cronMonitor, CONFIG)

    expect(plan.repeat.pattern).toBe("0 8 * * *")
    expect(plan.repeat.tz).toBe("Europe/Prague")
    expect(plan.repeat.every).toBeUndefined()
  })

  it("carries the interval in milliseconds for interval-scheduled monitors", () => {
    const plan = buildScrapeSchedulerPlan(intervalMonitor, CONFIG)

    expect(plan.repeat.every).toBe(300_000)
    expect(plan.repeat.pattern).toBeUndefined()
  })

  it("derives the jitter offset deterministically from the monitor id, within the window", () => {
    const plan = buildScrapeSchedulerPlan(cronMonitor, CONFIG)

    expect(plan.repeat.offset).toBeGreaterThanOrEqual(0)
    expect(plan.repeat.offset).toBeLessThan(cronMonitor.jitterSeconds * 1000)
    expect(buildScrapeSchedulerPlan(cronMonitor, CONFIG).repeat.offset).toBe(plan.repeat.offset)
  })

  it("carries the schedule trigger and a zero starting attempt, never the schedule value itself", () => {
    const plan = buildScrapeSchedulerPlan(cronMonitor, CONFIG)

    expect(plan.data).toEqual({ monitorId: cronMonitor.id, trigger: "schedule", attempt: 0 })
  })

  it("applies attempts and backoff from configuration, not a hardcoded value", () => {
    const plan = buildScrapeSchedulerPlan(cronMonitor, {
      scrapeMaxAttempts: 7,
      backoffBaseMs: 1234,
    })

    expect(plan.opts.attempts).toBe(7)
    expect(plan.opts.backoff).toEqual({ type: "exponential", delay: 1234 })
  })
})
