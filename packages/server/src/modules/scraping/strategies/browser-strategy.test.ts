import { it } from "@effect/vitest"
import { Effect, Exit, Redacted } from "effect"
import { describe, expect } from "vitest"

import type { ScrapeRequest } from "../scraping.schema.js"

import { makeBrowserStrategy } from "./browser-strategy.js"

const dependencies = {
  wsEndpoint: "",
  token: Redacted.make("test-token"),
  defaultTimeoutMs: 5000,
  blockResources: ["image", "media", "font"],
  screenshotsEnabled: true,
  blockedHostPatterns: [] as readonly string[],
}

const request: ScrapeRequest = {
  url: "http://93.184.216.34/" as ScrapeRequest["url"],
  request: {},
  browserOptions: {},
}

describe("makeBrowserStrategy", () => {
  it("reports its kind and refuses to handle when no endpoint is configured", () => {
    const strategy = makeBrowserStrategy(dependencies)
    expect(strategy.kind).toBe("browser")
    expect(strategy.accepts({} as never)).toBe(false)
  })

  it("handles when a websocket endpoint is configured", () => {
    const strategy = makeBrowserStrategy({ ...dependencies, wsEndpoint: "ws://browser:3000" })
    expect(strategy.accepts({} as never)).toBe(true)
  })

  it.effect("fails with browser_unavailable before connecting when no endpoint is configured", () =>
    Effect.gen(function* () {
      const strategy = makeBrowserStrategy(dependencies)
      const exit = yield* Effect.exit(strategy.fetch(request))

      expect(Exit.isFailure(exit)).toBe(true)
      if (Exit.isFailure(exit) && exit.cause._tag === "Fail") {
        expect(exit.cause.error._tag).toBe("ScrapeFailed")
        expect((exit.cause.error as { reason: string }).reason).toBe("browser_unavailable")
      }
    }),
  )

  it.effect("re-validates the target url before attempting to connect", () =>
    Effect.gen(function* () {
      const strategy = makeBrowserStrategy({ ...dependencies, wsEndpoint: "ws://browser:3000" })
      const exit = yield* Effect.exit(
        strategy.fetch({
          ...request,
          url: "http://127.0.0.1/admin" as ScrapeRequest["url"],
        }),
      )

      expect(Exit.isFailure(exit)).toBe(true)
      if (Exit.isFailure(exit) && exit.cause._tag === "Fail") {
        expect(exit.cause.error._tag).toBe("BlockedHost")
      }
    }),
  )
})
