import { AppConfig, SERVICE_TAG } from "@scraper/core"
import { Effect } from "effect"

import { makeHttpStrategy } from "./http-strategy.js"

export class HttpStrategy extends Effect.Service<HttpStrategy>()(SERVICE_TAG.HttpStrategy, {
  effect: Effect.gen(function* () {
    const config = yield* AppConfig
    return makeHttpStrategy({
      defaultUserAgent: config.scraping.userAgent,
      defaultTimeoutMs: config.scraping.timeoutMs,
      maxBytes: config.scraping.maxBytes,
      blockedHostPatterns: config.scraping.blockedHostPatterns,
    })
  }),
  dependencies: [AppConfig.Default],
}) {}
