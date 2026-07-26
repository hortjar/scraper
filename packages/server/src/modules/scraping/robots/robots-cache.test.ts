import { it } from "@effect/vitest"
import { Effect, TestClock } from "effect"
import { afterEach, describe, expect, vi } from "vitest"

import { makeRobotsCache } from "./robots-cache.js"

const ORIGIN = "http://93.184.216.34"

const jsonHeaders = { "content-type": "text/plain" }

const respond = (body: string, status = 200) => new Response(body, { status, headers: jsonHeaders })

const dependencies = {
  userAgent: "ScraperBot/1.0",
  blockedHostPatterns: [] as readonly string[],
  fetchTimeoutMs: 5000,
  maxBytes: 10_000,
  ttlMs: 1000,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("RobotsCache", () => {
  it.effect("fetches and evaluates robots.txt on a cache miss", () =>
    Effect.gen(function* () {
      const fetchMock = vi.fn().mockResolvedValue(respond("User-agent: *\nDisallow: /admin"))
      vi.stubGlobal("fetch", fetchMock)

      const cache = yield* makeRobotsCache(dependencies)
      const decision = yield* cache.check(`${ORIGIN}/admin/page`, "ScraperBot")

      expect(decision.allowed).toBe(false)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    }),
  )

  it.effect("reuses the cached rule set within the ttl", () =>
    Effect.gen(function* () {
      const fetchMock = vi.fn().mockResolvedValue(respond("User-agent: *\nDisallow: /admin"))
      vi.stubGlobal("fetch", fetchMock)

      const cache = yield* makeRobotsCache(dependencies)
      yield* cache.check(`${ORIGIN}/x`, "ScraperBot")
      yield* TestClock.adjust("500 millis")
      yield* cache.check(`${ORIGIN}/y`, "ScraperBot")

      expect(fetchMock).toHaveBeenCalledTimes(1)
    }),
  )

  it.effect("refetches after the ttl expires", () =>
    Effect.gen(function* () {
      const fetchMock = vi.fn().mockResolvedValue(respond("User-agent: *\nDisallow: /admin"))
      vi.stubGlobal("fetch", fetchMock)

      const cache = yield* makeRobotsCache(dependencies)
      yield* cache.check(`${ORIGIN}/x`, "ScraperBot")
      yield* TestClock.adjust("2 seconds")
      yield* cache.check(`${ORIGIN}/y`, "ScraperBot")

      expect(fetchMock).toHaveBeenCalledTimes(2)
    }),
  )

  it.effect("fails open (allows) when the fetch errors", () =>
    Effect.gen(function* () {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unreachable")))

      const cache = yield* makeRobotsCache(dependencies)
      const decision = yield* cache.check(`${ORIGIN}/whatever`, "ScraperBot")

      expect(decision.allowed).toBe(true)
    }),
  )

  it.effect("fails open when robots.txt responds with a server error", () =>
    Effect.gen(function* () {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond("", 500)))

      const cache = yield* makeRobotsCache(dependencies)
      const decision = yield* cache.check(`${ORIGIN}/whatever`, "ScraperBot")

      expect(decision.allowed).toBe(true)
    }),
  )

  it.effect("caches per origin independently", () =>
    Effect.gen(function* () {
      const fetchMock = vi.fn().mockResolvedValue(respond("User-agent: *\nDisallow: /"))
      vi.stubGlobal("fetch", fetchMock)

      const cache = yield* makeRobotsCache(dependencies)
      yield* cache.check(`${ORIGIN}/a`, "ScraperBot")
      yield* cache.check("http://8.8.8.8/a", "ScraperBot")

      expect(fetchMock).toHaveBeenCalledTimes(2)
    }),
  )
})
