import { describe, expect, it } from "vitest"

import { slidingWindowDecision } from "./sliding-window.js"

describe("slidingWindowDecision", () => {
  it("allows the first request in an empty window", () => {
    const decision = slidingWindowDecision({
      hitTimestamps: [],
      now: 100_000,
      windowMs: 60_000,
      limit: 6,
    })

    expect(decision).toEqual({ allowed: true, retryAfterMs: 0 })
  })

  it("allows a request while under the limit", () => {
    const decision = slidingWindowDecision({
      hitTimestamps: [95_000, 96_000, 97_000],
      now: 100_000,
      windowMs: 60_000,
      limit: 6,
    })

    expect(decision.allowed).toBe(true)
  })

  it("denies once the limit is reached inside the window", () => {
    const decision = slidingWindowDecision({
      hitTimestamps: [70_000, 80_000, 90_000, 95_000, 96_000, 97_000],
      now: 100_000,
      windowMs: 60_000,
      limit: 6,
    })

    expect(decision.allowed).toBe(false)
  })

  it("computes retryAfterMs from the oldest hit still inside the window", () => {
    const decision = slidingWindowDecision({
      hitTimestamps: [70_000, 80_000],
      now: 100_000,
      windowMs: 60_000,
      limit: 2,
    })

    expect(decision.allowed).toBe(false)
    expect(decision.retryAfterMs).toBe(70_000 + 60_000 - 100_000)
  })

  it("ignores hits that already fell outside the window", () => {
    const decision = slidingWindowDecision({
      hitTimestamps: [1000, 2000],
      now: 100_000,
      windowMs: 60_000,
      limit: 1,
    })

    expect(decision.allowed).toBe(true)
  })

  it("never returns a negative retryAfterMs", () => {
    const decision = slidingWindowDecision({
      hitTimestamps: [99_999],
      now: 100_000,
      windowMs: 60_000,
      limit: 1,
    })

    expect(decision.retryAfterMs).toBeGreaterThanOrEqual(0)
  })

  it("allows exactly at the limit boundary once the oldest hit expires", () => {
    const decision = slidingWindowDecision({
      hitTimestamps: [39_999, 90_000],
      now: 100_000,
      windowMs: 60_000,
      limit: 2,
    })

    expect(decision.allowed).toBe(true)
  })
})
