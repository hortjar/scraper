import { AppConfig, CACHE_TTL, SERVICE_TAG } from "@scraper/core"
import { Effect } from "effect"

import { ROBOTS_FETCH_TIMEOUT_MS, ROBOTS_MAX_BYTES } from "../scraping.constants.js"

import { makeRobotsCache } from "./robots-cache.js"

export type { RobotsDecision } from "./robots.parser.js"

export class RobotsCache extends Effect.Service<RobotsCache>()(SERVICE_TAG.RobotsCache, {
  effect: Effect.gen(function* () {
    const config = yield* AppConfig
    return yield* makeRobotsCache({
      userAgent: config.scraping.userAgent,
      blockedHostPatterns: config.scraping.blockedHostPatterns,
      fetchTimeoutMs: ROBOTS_FETCH_TIMEOUT_MS,
      maxBytes: ROBOTS_MAX_BYTES,
      ttlMs: CACHE_TTL.robotsSeconds * 1000,
    })
  }),
  dependencies: [AppConfig.Default],
}) {}
