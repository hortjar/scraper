import { AppConfig } from "@scraper/core/config"
import { REDIS_KEY, SPAN } from "@scraper/core/constants"
import { RateLimited } from "@scraper/core/errors"
import { Clock, Effect } from "effect"

import { AUTH_TAG, RATE_LIMIT_BUCKET, RATE_LIMIT_RULE } from "./auth.constants.js"

const MILLIS_PER_SECOND = 1000
const LOCKOUT_MAX_MULTIPLIER = 16
const LOCKOUT_MAX_SECONDS = 3600
const ZSET_WITH_SCORES = "WITHSCORES"

export interface RateLimitRule {
  readonly limit: number
  readonly windowSeconds: number
}

export interface RateLimitVerdict {
  readonly count: number
  readonly oldestMillis: number
}

export interface RateLimitRedis {
  readonly zremrangebyscore: (key: string, min: number, max: number) => Promise<number>
  readonly zadd: (key: string, score: number, member: string) => Promise<unknown>
  readonly zcard: (key: string) => Promise<number>
  readonly zrange: (
    key: string,
    start: number,
    stop: number,
    withScores: typeof ZSET_WITH_SCORES,
  ) => Promise<readonly string[]>
  readonly pexpire: (key: string, milliseconds: number) => Promise<unknown>
}

export interface RateLimitStoreApi {
  readonly hit: (
    key: string,
    windowMillis: number,
    nowMillis: number,
  ) => Effect.Effect<RateLimitVerdict>
}

export const makeInMemoryRateLimitStore = (): RateLimitStoreApi => {
  const hits = new Map<string, number[]>()

  return {
    hit: (key, windowMillis, nowMillis) =>
      Effect.sync(() => {
        const floor = nowMillis - windowMillis
        const kept = (hits.get(key) ?? []).filter((at) => at > floor)
        kept.push(nowMillis)
        hits.set(key, kept)
        return { count: kept.length, oldestMillis: kept[0] ?? nowMillis }
      }),
  }
}

export const makeRedisRateLimitStore = (client: RateLimitRedis): RateLimitStoreApi => ({
  hit: (key, windowMillis, nowMillis) =>
    Effect.promise(async () => {
      await client.zremrangebyscore(key, 0, nowMillis - windowMillis)
      await client.zadd(key, nowMillis, `${String(nowMillis)}:${key}`)
      await client.pexpire(key, windowMillis)
      const count = await client.zcard(key)
      const oldest = await client.zrange(key, 0, 0, ZSET_WITH_SCORES)
      const score = Number(oldest[1])
      return { count, oldestMillis: Number.isNaN(score) ? nowMillis : score }
    }).pipe(Effect.orElseSucceed(() => ({ count: 0, oldestMillis: nowMillis }))),
})

export class RateLimitStore extends Effect.Service<RateLimitStore>()(AUTH_TAG.RateLimitStore, {
  sync: makeInMemoryRateLimitStore,
}) {}

export const retryAfterSecondsFor = (
  rule: RateLimitRule,
  verdict: RateLimitVerdict,
  nowMillis: number,
): number => {
  const windowMillis = rule.windowSeconds * MILLIS_PER_SECOND
  const remaining = Math.max(
    1,
    Math.ceil((verdict.oldestMillis + windowMillis - nowMillis) / MILLIS_PER_SECOND),
  )
  const excess = Math.max(0, verdict.count - rule.limit - 1)
  const multiplier = Math.min(2 ** excess, LOCKOUT_MAX_MULTIPLIER)
  return Math.min(remaining * multiplier, LOCKOUT_MAX_SECONDS)
}

export class AuthRateLimiter extends Effect.Service<AuthRateLimiter>()(AUTH_TAG.RateLimiter, {
  effect: Effect.gen(function* () {
    const config = yield* AppConfig
    const store = yield* RateLimitStore

    const check = Effect.fn(SPAN.auth.rateLimit)(function* (
      bucket: string,
      identity: string,
      rule: RateLimitRule,
    ) {
      if (!config.security.rateLimitEnabled) return
      const nowMillis = yield* Clock.currentTimeMillis
      const verdict = yield* store.hit(
        REDIS_KEY.authRateLimit(bucket, identity),
        rule.windowSeconds * MILLIS_PER_SECOND,
        nowMillis,
      )
      if (verdict.count <= rule.limit) return
      return yield* new RateLimited({
        retryAfterSeconds: retryAfterSecondsFor(rule, verdict, nowMillis),
        bucket,
      })
    })

    const login = Effect.fn(SPAN.auth.rateLimit)(function* (ip: string, email: string) {
      yield* check(RATE_LIMIT_BUCKET.login, `${ip}|${email}`, RATE_LIMIT_RULE.login)
    })

    const register = Effect.fn(SPAN.auth.rateLimit)(function* (ip: string) {
      yield* check(RATE_LIMIT_BUCKET.register, ip, RATE_LIMIT_RULE.register)
    })

    const passwordReset = Effect.fn(SPAN.auth.rateLimit)(function* (ip: string, email: string) {
      yield* check(RATE_LIMIT_BUCKET.passwordReset, email, RATE_LIMIT_RULE.passwordResetPerEmail)
      yield* check(RATE_LIMIT_BUCKET.passwordReset, ip, RATE_LIMIT_RULE.passwordResetPerIp)
    })

    return { check, login, register, passwordReset } as const
  }),
  dependencies: [AppConfig.Default, RateLimitStore.Default],
}) {}
