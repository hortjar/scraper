import { AppConfig } from "@scraper/core/config"
import { SERVICE_TAG } from "@scraper/core/constants"
import { QueueUnavailable } from "@scraper/core/errors"
import { Effect, Redacted } from "effect"
import Redis, { type RedisOptions } from "ioredis"

import { REDIS_INFRA_LABEL, REDIS_SCAN_COUNT } from "./jobs.constants.js"

export const BULLMQ_CONNECTION_OPTIONS = {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
} satisfies Partial<RedisOptions>

const guard = <A>(operation: () => Promise<A>): Effect.Effect<A, QueueUnavailable> =>
  Effect.tryPromise({
    try: operation,
    catch: (cause) => new QueueUnavailable({ queue: REDIS_INFRA_LABEL, cause }),
  })

const scanAll = (
  client: Redis,
  pattern: string,
): Effect.Effect<readonly string[], QueueUnavailable> =>
  guard(async () => {
    const found: string[] = []
    let cursor = "0"
    do {
      const [next, keys] = await client.scan(cursor, "MATCH", pattern, "COUNT", REDIS_SCAN_COUNT)
      found.push(...keys)
      cursor = next
    } while (cursor !== "0")
    return found
  })

export class RedisClient extends Effect.Service<RedisClient>()(SERVICE_TAG.RedisClient, {
  scoped: Effect.gen(function* () {
    const config = yield* AppConfig

    const client = yield* Effect.acquireRelease(
      Effect.sync(() => new Redis(Redacted.value(config.redis.url), BULLMQ_CONNECTION_OPTIONS)),
      (redis) =>
        Effect.sync(() => {
          redis.disconnect()
        }),
    )

    const get = (key: string) => guard(() => client.get(key))

    const set = (key: string, value: string, ttlSeconds?: number) =>
      guard(() =>
        ttlSeconds === undefined
          ? client.set(key, value)
          : client.set(key, value, "EX", ttlSeconds),
      )

    const del = (key: string) => guard(() => client.del(key))

    const ttl = (key: string) => guard(() => client.ttl(key))

    const zrangeByScore = (key: string, min: number, max: number) =>
      guard(() => client.zrangebyscore(key, min, max))

    const recordSlidingWindowHit = (key: string, member: string, score: number, windowMs: number) =>
      guard(async () => {
        await client.zadd(key, score, member)
        await client.zremrangebyscore(key, 0, score - windowMs)
        await client.pexpire(key, windowMs)
      })

    const scanKeys = (pattern: string) => scanAll(client, pattern)

    const readSetMembers = (key: string) => guard(() => client.smembers(key))

    return {
      client,
      get,
      set,
      del,
      ttl,
      zrangeByScore,
      recordSlidingWindowHit,
      scanKeys,
      readSetMembers,
    } as const
  }),
  dependencies: [AppConfig.Default],
}) {}
