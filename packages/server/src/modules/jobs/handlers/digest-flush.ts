import { REDIS_KEY, SPAN } from "@scraper/core/constants"
import { DeliveryId } from "@scraper/core/domain"
import { Effect, Either, Schema } from "effect"

import { RedisClient } from "../../redis/index.js"
import { JobProducer } from "../job-producer.service.js"
import type { DigestJobPayload } from "../jobs.schema.js"

export const flushDigest = Effect.fn(SPAN.digest.flush)(function* (payload: DigestJobPayload) {
  const redis = yield* RedisClient
  const producer = yield* JobProducer

  const key = REDIS_KEY.digestBucket(payload.ruleId)
  const members = yield* redis.readSetMembers(key)
  const decoded = members.map((member) => Schema.decodeUnknownEither(DeliveryId)(member))
  const deliveryIds = decoded
    .filter((either) => Either.isRight(either))
    .map((either) => either.right)
  const invalidCount = decoded.length - deliveryIds.length

  if (invalidCount > 0) {
    yield* Effect.logWarning("job.digest.invalidBucketMember").pipe(
      Effect.annotateLogs({ ruleId: payload.ruleId, invalidCount }),
    )
  }

  yield* Effect.forEach(deliveryIds, (deliveryId) => producer.enqueueNotify({ deliveryId }), {
    discard: true,
  })

  yield* redis.del(key)
})
