import { describe, expect, it } from "vitest"

import { deterministicJitterMs } from "./jitter.js"

describe("deterministicJitterMs", () => {
  it("is zero when no jitter window is configured", () => {
    expect(deterministicJitterMs("monitor-a", 0)).toBe(0)
  })

  it("is stable across repeated calls with the same seed", () => {
    const first = deterministicJitterMs("11111111-1111-1111-1111-111111111111", 60)
    const second = deterministicJitterMs("11111111-1111-1111-1111-111111111111", 60)

    expect(first).toBe(second)
  })

  it("stays within the configured jitter window", () => {
    const seeds = ["a", "b", "monitor-1", "22222222-2222-2222-2222-222222222222"]
    const jitterSeconds = 45

    for (const seed of seeds) {
      const value = deterministicJitterMs(seed, jitterSeconds)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(jitterSeconds * 1000)
    }
  })

  it("spreads distinct seeds across the window rather than collapsing to one value", () => {
    const values = new Set(
      Array.from({ length: 20 }, (_, index) =>
        deterministicJitterMs(`monitor-${String(index)}`, 3600),
      ),
    )

    expect(values.size).toBeGreaterThan(10)
  })

  it("never uses Math.random, so results are reproducible without a seeded RNG", () => {
    const a = deterministicJitterMs("stable-seed", 30)
    const b = deterministicJitterMs("stable-seed", 30)
    const c = deterministicJitterMs("stable-seed", 30)

    expect(a).toBe(b)
    expect(b).toBe(c)
  })
})
