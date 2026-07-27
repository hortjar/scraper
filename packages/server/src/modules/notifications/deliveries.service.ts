import { DELIVERY_STATUS, SERVICE_TAG, SPAN } from "@scraper/core/constants"
import type { DeliveryId, UserId } from "@scraper/core/domain"
import { DeliveryNotFound } from "@scraper/core/errors"
import { Effect } from "effect"

import { JobProducer } from "../jobs/index.js"

import { DeliveryRepository, DeliveryRepositoryLive } from "./delivery.repository.js"

export interface DeliveryFilters {
  readonly ruleId: string | null
  readonly channelId: string | null
  readonly status: string | null
  readonly limit: number
}

export class Deliveries extends Effect.Service<Deliveries>()(SERVICE_TAG.Deliveries, {
  effect: Effect.gen(function* () {
    const repository = yield* DeliveryRepository
    const jobs = yield* JobProducer

    const list = Effect.fn(SPAN.deliveries.list)(function* (
      userId: UserId,
      filters: DeliveryFilters,
    ) {
      return yield* repository.listFiltered(
        userId,
        { ruleId: filters.ruleId, channelId: filters.channelId, status: filters.status },
        filters.limit,
      )
    })

    const retry = Effect.fn(SPAN.deliveries.retry)(function* (
      userId: UserId,
      deliveryId: DeliveryId,
    ) {
      const existing = yield* repository.findById(userId, deliveryId)
      if (existing === null) return yield* Effect.fail(new DeliveryNotFound({ id: deliveryId }))

      const reset = yield* repository.updateStatus(deliveryId, {
        status: DELIVERY_STATUS.pending,
      })
      yield* jobs.enqueueNotify({ deliveryId })
      return reset
    })

    return { list, retry } as const
  }),
  dependencies: [DeliveryRepositoryLive, JobProducer.Default],
}) {}

export const DeliveriesLive = Deliveries.Default
