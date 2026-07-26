import { SCHEDULE_KIND } from "@scraper/core/constants"
import type { Schedule } from "@scraper/core/domain"
import { Effect, Exit } from "effect"
import { describe, expect, it } from "vitest"

import { assertScheduleWithinFloor, scheduleColumns } from "./monitors.service.js"

const TIMEZONE = "UTC" as Schedule["timezone"]

const interval = (seconds: number): Schedule => ({
  kind: SCHEDULE_KIND.interval,
  intervalSeconds: seconds,
  timezone: TIMEZONE,
})

const cron = (expression: string): Schedule => ({
  kind: SCHEDULE_KIND.cron,
  expression: expression as never,
  timezone: TIMEZONE,
})

describe("scheduleColumns", () => {
  it("stores an interval as its seconds", () => {
    expect(scheduleColumns(interval(600))).toEqual({
      scheduleKind: SCHEDULE_KIND.interval,
      scheduleValue: "600",
      scheduleTimezone: TIMEZONE,
    })
  })

  it("stores a cron schedule as its expression", () => {
    expect(scheduleColumns(cron("*/5 * * * *"))).toEqual({
      scheduleKind: SCHEDULE_KIND.cron,
      scheduleValue: "*/5 * * * *",
      scheduleTimezone: TIMEZONE,
    })
  })
})

describe("assertScheduleWithinFloor", () => {
  it("accepts an interval at the floor", () => {
    const exit = Effect.runSyncExit(assertScheduleWithinFloor(interval(300), 300))
    expect(Exit.isSuccess(exit)).toBe(true)
  })

  it("rejects an interval below the floor", () => {
    const exit = Effect.runSyncExit(assertScheduleWithinFloor(interval(60), 300))
    expect(Exit.isFailure(exit)).toBe(true)
  })

  it("never rejects a cron schedule, which has no interval to compare", () => {
    const exit = Effect.runSyncExit(assertScheduleWithinFloor(cron("* * * * *"), 3600))
    expect(Exit.isSuccess(exit)).toBe(true)
  })
})
