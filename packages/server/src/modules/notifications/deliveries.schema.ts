import {
  ChangeId,
  ChannelId,
  DeliveryId,
  DeliveryStatus,
  MonitorId,
  NonNegativeInt,
  RuleId,
  SuppressionReason,
} from "@scraper/core/domain"
import { Schema } from "effect"

export const DeliveryIdParameters = Schema.Struct({ deliveryId: DeliveryId })

export const DeliveryListQuery = Schema.Struct({
  ruleId: Schema.optional(Schema.String),
  channelId: Schema.optional(Schema.String),
  status: Schema.optional(Schema.String),
  limit: Schema.optional(Schema.String),
})

export const DeliveryDto = Schema.Struct({
  id: DeliveryId,
  ruleId: RuleId,
  channelId: ChannelId,
  monitorId: MonitorId,
  changeIds: Schema.Array(ChangeId),
  status: DeliveryStatus,
  suppressedReason: Schema.NullOr(SuppressionReason),
  attempts: NonNegativeInt,
  lastError: Schema.NullOr(Schema.String),
  providerMessageId: Schema.NullOr(Schema.String),
  sentAt: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
})
export type DeliveryDto = typeof DeliveryDto.Type

export const DeliveryListDto = Schema.Struct({ items: Schema.Array(DeliveryDto) })

export const DeliveryRetryDto = Schema.Struct({
  deliveryId: DeliveryId,
  status: DeliveryStatus,
})
