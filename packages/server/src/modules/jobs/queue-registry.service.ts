import { AppConfig } from "@scraper/core/config"
import { QUEUE, SERVICE_TAG } from "@scraper/core/constants"
import { Queue } from "bullmq"
import { Effect } from "effect"
import type Redis from "ioredis"

import { RedisClient } from "../redis/index.js"

import type {
  DigestJobPayload,
  MaintenanceJobPayload,
  NotifyJobPayload,
  ScrapeJobPayload,
} from "./jobs.schema.js"

const makeQueue = <Data>(name: string, prefix: string, connection: Redis) =>
  Effect.acquireRelease(
    Effect.sync(() => new Queue<Data>(name, { connection, prefix })),
    (queue) => Effect.promise(() => queue.close()),
  )

export class QueueRegistry extends Effect.Service<QueueRegistry>()(SERVICE_TAG.QueueRegistry, {
  scoped: Effect.gen(function* () {
    const config = yield* AppConfig
    const redis = yield* RedisClient
    const prefix = config.redis.jobPrefix

    const scrape = yield* makeQueue<ScrapeJobPayload>(QUEUE.scrape, prefix, redis.client)
    const notify = yield* makeQueue<NotifyJobPayload>(QUEUE.notify, prefix, redis.client)
    const digest = yield* makeQueue<DigestJobPayload>(QUEUE.digest, prefix, redis.client)
    const maintenance = yield* makeQueue<MaintenanceJobPayload>(
      QUEUE.maintenance,
      prefix,
      redis.client,
    )

    return { scrape, notify, digest, maintenance } as const
  }),
  dependencies: [AppConfig.Default, RedisClient.Default],
}) {}
