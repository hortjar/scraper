import { it } from "@effect/vitest"
import { Effect, Exit } from "effect"
import { afterEach, describe, expect, vi } from "vitest"

import type { ScrapeRequest } from "../scraping.schema.js"

import { makeHttpStrategy } from "./http-strategy.js"

const dependencies = {
  defaultUserAgent: "ScraperBot/1.0 (+https://example.org)",
  defaultTimeoutMs: 5000,
  maxBytes: 1_000_000,
  blockedHostPatterns: [] as readonly string[],
}

const baseRequest: ScrapeRequest = {
  url: "http://93.184.216.34/" as ScrapeRequest["url"],
  request: {},
  browserOptions: {},
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("makeHttpStrategy", () => {
  it.effect("fetches and reports timings and status", () =>
    Effect.gen(function* () {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("<html>hi</html>", { status: 200 })),
      )

      const strategy = makeHttpStrategy(dependencies)
      const result = yield* strategy.fetch(baseRequest)

      expect(result.html).toBe("<html>hi</html>")
      expect(result.httpStatus).toBe(200)
      expect(result.strategy).toBe("http")
      expect(result.timings.totalMs).toBeGreaterThanOrEqual(0)
    }),
  )

  it.effect("sends the configured user agent by default", () =>
    Effect.gen(function* () {
      const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }))
      vi.stubGlobal("fetch", fetchMock)

      const strategy = makeHttpStrategy(dependencies)
      yield* strategy.fetch(baseRequest)

      const init = fetchMock.mock.calls[0]?.[1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers["user-agent"]).toBe(dependencies.defaultUserAgent)
    }),
  )

  it.effect("lets the monitor override the user agent", () =>
    Effect.gen(function* () {
      const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }))
      vi.stubGlobal("fetch", fetchMock)

      const strategy = makeHttpStrategy(dependencies)
      yield* strategy.fetch({ ...baseRequest, request: { userAgent: "CustomBot/2.0" } })

      const init = fetchMock.mock.calls[0]?.[1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers["user-agent"]).toBe("CustomBot/2.0")
    }),
  )

  it.effect("serializes cookies onto the cookie header", () =>
    Effect.gen(function* () {
      const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }))
      vi.stubGlobal("fetch", fetchMock)

      const strategy = makeHttpStrategy(dependencies)
      yield* strategy.fetch({
        ...baseRequest,
        request: { cookies: { session: "abc", theme: "dark" } },
      })

      const init = fetchMock.mock.calls[0]?.[1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers.cookie).toBe("session=abc; theme=dark")
    }),
  )

  it.effect("sends conditional headers when a prior etag or last-modified is known", () =>
    Effect.gen(function* () {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 304 }))
      vi.stubGlobal("fetch", fetchMock)

      const strategy = makeHttpStrategy(dependencies)
      const result = yield* strategy.fetch({
        ...baseRequest,
        ifNoneMatch: '"abc123"',
        ifModifiedSince: "Wed, 21 Oct 2015 07:28:00 GMT",
      })

      const init = fetchMock.mock.calls[0]?.[1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers["if-none-match"]).toBe('"abc123"')
      expect(headers["if-modified-since"]).toBe("Wed, 21 Oct 2015 07:28:00 GMT")
      expect(result.httpStatus).toBe(304)
    }),
  )

  it.effect("follows a redirect and reports the final url", () =>
    Effect.gen(function* () {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(null, {
            status: 302,
            headers: { location: "http://8.8.8.8/landing" },
          }),
        )
        .mockResolvedValueOnce(new Response("landed", { status: 200 }))
      vi.stubGlobal("fetch", fetchMock)

      const strategy = makeHttpStrategy(dependencies)
      const result = yield* strategy.fetch(baseRequest)

      expect(result.finalUrl).toBe("http://8.8.8.8/landing")
      expect(result.html).toBe("landed")
      expect(fetchMock).toHaveBeenCalledTimes(2)
    }),
  )

  it.effect("fails the run when a redirect targets a private address", () =>
    Effect.gen(function* () {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(null, { status: 302, headers: { location: "http://127.0.0.1/secrets" } }),
          ),
      )

      const strategy = makeHttpStrategy(dependencies)
      const exit = yield* Effect.exit(strategy.fetch(baseRequest))

      expect(Exit.isFailure(exit)).toBe(true)
      if (Exit.isFailure(exit) && exit.cause._tag === "Fail") {
        expect(exit.cause.error._tag).toBe("BlockedHost")
      }
    }),
  )

  it.effect("fails closed before ever fetching a blocked target", () =>
    Effect.gen(function* () {
      const fetchMock = vi.fn()
      vi.stubGlobal("fetch", fetchMock)

      const strategy = makeHttpStrategy(dependencies)
      const exit = yield* Effect.exit(
        strategy.fetch({
          ...baseRequest,
          url: "http://169.254.169.254/latest/meta-data" as ScrapeRequest["url"],
        }),
      )

      expect(Exit.isFailure(exit)).toBe(true)
      expect(fetchMock).not.toHaveBeenCalled()
    }),
  )

  it("advertises the http kind and handles everything", () => {
    const strategy = makeHttpStrategy(dependencies)
    expect(strategy.kind).toBe("http")
    expect(strategy.accepts({} as never)).toBe(true)
  })
})
