import { Either, Schema } from "effect"
import { describe, expect, it } from "vitest"

import {
  DigestJobPayload,
  MaintenanceJobPayload,
  NotifyJobPayload,
  ScrapeJobPayload,
} from "./jobs.schema.js"

const MONITOR_ID = "11111111-1111-1111-1111-111111111111"
const DELIVERY_ID = "22222222-2222-2222-2222-222222222222"
const RULE_ID = "33333333-3333-3333-3333-333333333333"

describe("ScrapeJobPayload", () => {
  it("decodes a well-formed scrape payload", () => {
    const result = Schema.decodeUnknownEither(ScrapeJobPayload)({
      monitorId: MONITOR_ID,
      trigger: "schedule",
      attempt: 1,
    })

    expect(Either.isRight(result)).toBe(true)
  })

  it("rejects a trigger outside the known set — job data may be stale", () => {
    const result = Schema.decodeUnknownEither(ScrapeJobPayload)({
      monitorId: MONITOR_ID,
      trigger: "cron",
      attempt: 1,
    })

    expect(Either.isLeft(result)).toBe(true)
  })

  it("rejects attempt 0 — runs.attempt is CHECK (attempt >= 1) and the insert would fail", () => {
    const result = Schema.decodeUnknownEither(ScrapeJobPayload)({
      monitorId: MONITOR_ID,
      trigger: "schedule",
      attempt: 0,
    })

    expect(Either.isLeft(result)).toBe(true)
  })

  it("rejects a negative attempt count", () => {
    const result = Schema.decodeUnknownEither(ScrapeJobPayload)({
      monitorId: MONITOR_ID,
      trigger: "manual",
      attempt: -1,
    })

    expect(Either.isLeft(result)).toBe(true)
  })

  it("rejects a monitorId that is not a uuid", () => {
    const result = Schema.decodeUnknownEither(ScrapeJobPayload)({
      monitorId: "not-a-uuid",
      trigger: "manual",
      attempt: 1,
    })

    expect(Either.isLeft(result)).toBe(true)
  })
})

describe("NotifyJobPayload", () => {
  it("decodes a well-formed notify payload", () => {
    const result = Schema.decodeUnknownEither(NotifyJobPayload)({ deliveryId: DELIVERY_ID })

    expect(Either.isRight(result)).toBe(true)
  })

  it("rejects a missing deliveryId", () => {
    const result = Schema.decodeUnknownEither(NotifyJobPayload)({})

    expect(Either.isLeft(result)).toBe(true)
  })
})

describe("DigestJobPayload", () => {
  it("decodes a well-formed digest payload", () => {
    const result = Schema.decodeUnknownEither(DigestJobPayload)({
      ruleId: RULE_ID,
      windowStart: "2026-01-01T00:00:00.000Z",
      windowEnd: "2026-01-01T01:00:00.000Z",
    })

    expect(Either.isRight(result)).toBe(true)
  })
})

describe("MaintenanceJobPayload", () => {
  it("decodes every known maintenance task", () => {
    const tasks = [
      "reconcile-schedules",
      "sweep-runs",
      "sweep-sessions",
      "refresh-stats",
      "prune-robots",
      "heartbeat",
    ]

    for (const task of tasks) {
      const result = Schema.decodeUnknownEither(MaintenanceJobPayload)({ task })
      expect(Either.isRight(result)).toBe(true)
    }
  })

  it("rejects a task that predates a deploy or was typo'd", () => {
    const result = Schema.decodeUnknownEither(MaintenanceJobPayload)({ task: "vacuum" })

    expect(Either.isLeft(result)).toBe(true)
  })
})
