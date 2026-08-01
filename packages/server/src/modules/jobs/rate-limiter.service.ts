import { AppConfig } from "@scraper/core/config"
import { REDIS_KEY, SERVICE_TAG, SPAN } from "@scraper/core/constants"
import { RateLimited, type QueueUnavailable } from "@scraper/core/errors"
import { Clock, Effect } from "effect"

import { RedisClient } from "../redis/index.js"

import { RATE_LIMIT_WINDOW_MS } from "./jobs.constants.js"
import { slidingWindowDecision } from "./sliding-window.js"

export class RateLimiter extends Effect.Service<RateLimiter>()(SERVICE_TAG.RateLimiter, {
  effect: Effect.gen(function* () {
    const redis = yield* RedisClient
    const config = yield* AppConfig

    const checkDomain = Effect.fn(SPAN.rateLimiter.checkDomain)(function* (host: string) {
      const key = REDIS_KEY.domainRateLimit(host)
      const now = yield* Clock.currentTimeMillis
      const windowStart = now - RATE_LIMIT_WINDOW_MS
      const hits = yield* redis.zrangeByScore(key, windowStart, now)

      const decision = slidingWindowDecision({
        hitTimestamps: hits.map(Number),
        now,
        windowMs: RATE_LIMIT_WINDOW_MS,
        limit: config.scraping.domainRateLimitPerMinute,
      })

      if (!decision.allowed) {
        return yield* Effect.fail(
          new RateLimited({
            retryAfterSeconds: Math.ceil(decision.retryAfterMs / 1000),
            bucket: host,
          }),
        )
      }

      yield* redis.recordSlidingWindowHit(key, String(now), now, RATE_LIMIT_WINDOW_MS)
    })

    return { checkDomain } as const
  }),
  dependencies: [RedisClient.Default, AppConfig.Default],
}) {}

export type RateLimiterCheckError = RateLimited | QueueUnavailable
