import { API_TAG, HTTP_STATUS, PAGINATION, ROUTE } from "@scraper/core/constants"
import type { NotificationDelivery } from "@scraper/core/domain"
import { Effect, Schema } from "effect"
import { Elysia } from "elysia"

import type { AuthPluginOptions } from "../auth/index.js"
import { authBase, FAILURES, requireUser } from "../auth/index.js"

import { CHANNEL_SCOPE } from "./channels.constants.js"
import { DELIVERY_PATH, DELIVERY_PLUGIN } from "./deliveries.constants.js"
import {
  type DeliveryDto,
  DeliveryIdParameters,
  DeliveryListDto,
  DeliveryRetryDto,
} from "./deliveries.schema.js"
import { Deliveries } from "./deliveries.service.js"
import { NOTIFICATIONS_OPERATION_ID } from "./notifications.constants.js"

const standardParameters = Schema.standardSchemaV1(DeliveryIdParameters)
const standardList = Schema.standardSchemaV1(DeliveryListDto)
const standardRetry = Schema.standardSchemaV1(DeliveryRetryDto)

export type DeliveryServices = Deliveries

const iso = (value: Date): string => value.toISOString()

const toDeliveryDto = (delivery: NotificationDelivery): typeof DeliveryDto.Type => ({
  id: delivery.id,
  ruleId: delivery.ruleId,
  channelId: delivery.channelId,
  monitorId: delivery.monitorId,
  changeIds: delivery.changeIds,
  status: delivery.status,
  suppressedReason: delivery.suppressedReason,
  attempts: delivery.attempts,
  lastError: delivery.lastError,
  providerMessageId: delivery.providerMessageId,
  sentAt: delivery.sentAt === null ? null : iso(delivery.sentAt),
  createdAt: iso(delivery.createdAt),
})

const blankToNull = (value: string | undefined): string | null =>
  value === undefined || value === "" ? null : value

const limitFrom = (raw: string | undefined): number => {
  if (raw === undefined) return PAGINATION.defaultLimit
  const parsed = Math.trunc(Number(raw))
  if (!Number.isFinite(parsed)) return PAGINATION.defaultLimit
  return Math.min(Math.max(parsed, 1), PAGINATION.maxLimit)
}

const deliveryHandlers = (options: AuthPluginOptions<DeliveryServices>) =>
  authBase<DeliveryServices>(options, DELIVERY_PLUGIN.handlers)
    .use(requireUser(options))
    .get(
      DELIVERY_PATH.root,
      ({ runAuthFx, user, query }) =>
        runAuthFx(
          Effect.flatMap(Deliveries, (deliveries) =>
            deliveries
              .list(user.userId, {
                ruleId: blankToNull(query.ruleId),
                channelId: blankToNull(query.channelId),
                status: blankToNull(query.status),
                limit: limitFrom(query.limit),
              })
              .pipe(Effect.map((items) => ({ items: items.map((item) => toDeliveryDto(item)) }))),
          ),
        ),
      {
        auth: { scopes: [CHANNEL_SCOPE.read] },
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardList },
        detail: {
          summary: "List notification deliveries",
          operationId: NOTIFICATIONS_OPERATION_ID.listDeliveries,
          tags: [API_TAG.rules],
        },
      },
    )
    .post(
      DELIVERY_PATH.retry,
      ({ runAuthFx, user, params, set }) => {
        set.status = HTTP_STATUS.accepted
        return runAuthFx(
          Effect.flatMap(Deliveries, (deliveries) =>
            deliveries.retry(user.userId, params.deliveryId).pipe(
              Effect.map((delivery) => ({
                deliveryId: delivery.id,
                status: delivery.status,
              })),
            ),
          ),
        )
      },
      {
        auth: { scopes: [CHANNEL_SCOPE.write] },
        params: standardParameters,
        response: { ...FAILURES, [HTTP_STATUS.accepted]: standardRetry },
        detail: {
          summary: "Queue a failed delivery to be sent again",
          operationId: NOTIFICATIONS_OPERATION_ID.retryDelivery,
          tags: [API_TAG.rules],
        },
      },
    )

export const deliveryRoutes = (options: AuthPluginOptions<DeliveryServices>) =>
  new Elysia({
    name: DELIVERY_PLUGIN.routes,
    prefix: ROUTE.deliveries,
    tags: [API_TAG.rules],
  }).use(deliveryHandlers(options))
