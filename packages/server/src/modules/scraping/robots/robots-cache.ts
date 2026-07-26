import { HEADER, SPAN } from "@scraper/core"
import { Clock, Effect, Ref } from "effect"

import { ROBOTS_PATH } from "../scraping.constants.js"
import { guardedFetch, type GuardedFetchOptions } from "../strategies/guarded-fetch.js"

import {
  EMPTY_ROBOTS_RULE_SET,
  evaluateRobots,
  parseRobotsTxt,
  type RobotsRuleSet,
} from "./robots.parser.js"

export type { RobotsDecision } from "./robots.parser.js"

interface CacheEntry {
  readonly expiresAtMs: number
  readonly ruleSet: RobotsRuleSet
}

export interface RobotsCacheDependencies {
  readonly userAgent: string
  readonly blockedHostPatterns: readonly string[]
  readonly fetchTimeoutMs: number
  readonly maxBytes: number
  readonly ttlMs: number
}

export const makeRobotsCache = (dependencies: RobotsCacheDependencies) =>
  Effect.gen(function* () {
    const cache = yield* Ref.make(new Map<string, CacheEntry>())

    const fetchOptions: GuardedFetchOptions = {
      timeoutMs: dependencies.fetchTimeoutMs,
      maxBytes: dependencies.maxBytes,
      blockedHostPatterns: dependencies.blockedHostPatterns,
    }

    const fetchRuleSet = (origin: string): Effect.Effect<RobotsRuleSet> =>
      guardedFetch(
        {
          url: new URL(ROBOTS_PATH, origin).href,
          method: "GET",
          headers: { [HEADER.userAgent]: dependencies.userAgent },
        },
        fetchOptions,
      ).pipe(
        Effect.map((response) =>
          response.status >= 200 && response.status < 300
            ? parseRobotsTxt(response.body)
            : EMPTY_ROBOTS_RULE_SET,
        ),
        Effect.catchAll(() => Effect.succeed(EMPTY_ROBOTS_RULE_SET)),
      )

    const ruleSetFor = (origin: string): Effect.Effect<RobotsRuleSet> =>
      Effect.gen(function* () {
        const nowMs = yield* Clock.currentTimeMillis
        const cached = (yield* Ref.get(cache)).get(origin)
        if (cached !== undefined && cached.expiresAtMs > nowMs) return cached.ruleSet

        const fetched = yield* fetchRuleSet(origin)
        yield* Ref.update(cache, (map) => {
          const next = new Map(map)
          next.set(origin, { ruleSet: fetched, expiresAtMs: nowMs + dependencies.ttlMs })
          return next
        })
        return fetched
      })

    const check = Effect.fn(SPAN.scraping.robots)(function* (targetUrl: string, userAgent: string) {
      const url = new URL(targetUrl)
      const ruleSet = yield* ruleSetFor(url.origin)
      return evaluateRobots(ruleSet, userAgent, `${url.pathname}${url.search}`)
    })

    return { check } as const
  })
