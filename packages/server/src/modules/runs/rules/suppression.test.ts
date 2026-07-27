import { CHANGE_KIND, DELIVERY_MODE } from "@scraper/core/constants"
import type { ExtractorKey, QuietHours } from "@scraper/core/domain"
import { describe, expect, it } from "vitest"

import type { ChangeDraft } from "../diff/field-diff.js"

import { isWithinQuietHours, localMinutesOfDay, minutesOfDay } from "./quiet-hours.js"
import { decideDelivery, isHeldForLaterDelivery, isThrottled, messageHash } from "./suppression.js"
import type { DeliveryDecisionInput } from "./suppression.js"

const NOW = new Date("2026-07-27T12:00:00Z")

const input = (fields: Partial<DeliveryDecisionInput>): DeliveryDecisionInput => ({
  channelEnabled: true,
  channelVerified: true,
  throttleSeconds: 0,
  lastFiredAt: null,
  quietHours: null,
  deliveryMode: DELIVERY_MODE.immediate,
  now: NOW,
  ...fields,
})

const quietHours = (start: string, end: string, timezone: string): QuietHours =>
  ({ start, end, timezone }) as QuietHours

const change = (fields: Partial<ChangeDraft>): ChangeDraft => ({
  extractorKey: "price" as ExtractorKey,
  changeKind: CHANGE_KIND.modified,
  oldValue: null,
  newValue: null,
  oldNumber: null,
  newNumber: null,
  deltaAbsolute: null,
  deltaPercent: null,
  diff: null,
  ...fields,
})

describe("minutesOfDay", () => {
  it("converts a quiet-hour time to minutes", () => {
    expect(minutesOfDay("22:30")).toBe(1350)
    expect(minutesOfDay("00:00")).toBe(0)
  })
})

describe("localMinutesOfDay", () => {
  it("reads the wall clock in the rule's timezone, not the server's", () => {
    expect(localMinutesOfDay(NOW, "UTC")).toBe(720)
    expect(localMinutesOfDay(NOW, "Europe/Prague")).toBe(840)
    expect(localMinutesOfDay(NOW, "America/New_York")).toBe(480)
  })
})

describe("isWithinQuietHours", () => {
  it("handles a window inside one day", () => {
    expect(isWithinQuietHours(quietHours("09:00", "17:00", "UTC"), NOW)).toBe(true)
    expect(isWithinQuietHours(quietHours("13:00", "17:00", "UTC"), NOW)).toBe(false)
  })

  it("handles a window that crosses midnight", () => {
    const overnight = quietHours("22:00", "07:00", "UTC")

    expect(isWithinQuietHours(overnight, new Date("2026-07-27T23:00:00Z"))).toBe(true)
    expect(isWithinQuietHours(overnight, new Date("2026-07-27T05:00:00Z"))).toBe(true)
    expect(isWithinQuietHours(overnight, NOW)).toBe(false)
  })

  it("treats an empty window as never quiet", () => {
    expect(isWithinQuietHours(quietHours("09:00", "09:00", "UTC"), NOW)).toBe(false)
  })

  it("uses the rule's timezone to decide", () => {
    const window = quietHours("13:00", "15:00", "Europe/Prague")

    expect(isWithinQuietHours(window, NOW)).toBe(true)
    expect(isWithinQuietHours(quietHours("13:00", "15:00", "UTC"), NOW)).toBe(false)
  })
})

describe("isThrottled", () => {
  it("is false when no throttle is configured", () => {
    expect(isThrottled(0, new Date("2026-07-27T11:59:59Z"), NOW)).toBe(false)
  })

  it("is false when the rule has never fired", () => {
    expect(isThrottled(3600, null, NOW)).toBe(false)
  })

  it("is true inside the window and false at its edge", () => {
    expect(isThrottled(3600, new Date("2026-07-27T11:30:00Z"), NOW)).toBe(true)
    expect(isThrottled(3600, new Date("2026-07-27T11:00:00Z"), NOW)).toBe(false)
  })
})

describe("decideDelivery", () => {
  it("sends when nothing suppresses", () => {
    expect(decideDelivery(input({}))).toBeNull()
  })

  it("checks the channel before anything else", () => {
    expect(decideDelivery(input({ channelEnabled: false, throttleSeconds: 3600 }))).toBe(
      "channel_disabled",
    )
    expect(decideDelivery(input({ channelVerified: false }))).toBe("channel_unverified")
  })

  it("prefers throttling over quiet hours", () => {
    const decision = decideDelivery(
      input({
        throttleSeconds: 3600,
        lastFiredAt: new Date("2026-07-27T11:30:00Z"),
        quietHours: quietHours("09:00", "17:00", "UTC"),
      }),
    )

    expect(decision).toBe("throttled")
  })

  it("holds a message that lands in quiet hours", () => {
    const decision = decideDelivery(input({ quietHours: quietHours("09:00", "17:00", "UTC") }))

    expect(decision).toBe("quiet_hours")
  })

  it("holds a digest rule", () => {
    expect(decideDelivery(input({ deliveryMode: DELIVERY_MODE.digest }))).toBe("digest_pending")
  })
})

describe("isHeldForLaterDelivery", () => {
  it("separates the reasons that will still be delivered from the ones that never will", () => {
    expect(isHeldForLaterDelivery("digest_pending")).toBe(true)
    expect(isHeldForLaterDelivery("quiet_hours")).toBe(true)
    expect(isHeldForLaterDelivery("throttled")).toBe(false)
    expect(isHeldForLaterDelivery(null)).toBe(false)
  })
})

describe("messageHash", () => {
  it("is stable for the same changes in a different order", () => {
    const first = change({ newValue: "a" })
    const second = change({ newValue: "b" })

    expect(messageHash([first, second])).toBe(messageHash([second, first]))
  })

  it("differs when a value differs", () => {
    expect(messageHash([change({ newValue: "a" })])).not.toBe(
      messageHash([change({ newValue: "b" })]),
    )
  })

  it("does not collide when a value boundary shifts between fields", () => {
    expect(messageHash([change({ oldValue: "ab", newValue: "" })])).not.toBe(
      messageHash([change({ oldValue: "a", newValue: "b" })]),
    )
  })
})
