import {
  ChannelId,
  CronExpression,
  DeliveryMode,
  ExtractorKey,
  MonitorId,
  NonEmptyString,
  NonNegativeInt,
  QuietHours,
  RuleId,
  TriggerConfig,
} from "@scraper/core/domain"
import { Schema } from "effect"

export const CreateRuleBody = Schema.Struct({
  channelId: ChannelId,
  name: NonEmptyString,
  trigger: TriggerConfig,
  extractorKey: Schema.optionalWith(Schema.NullOr(ExtractorKey), { default: () => null }),
  deliveryMode: Schema.optionalWith(DeliveryMode, { default: () => "immediate" as const }),
  digestCron: Schema.optionalWith(Schema.NullOr(CronExpression), { default: () => null }),
  throttleSeconds: Schema.optionalWith(NonNegativeInt, { default: () => 0 }),
  quietHours: Schema.optionalWith(Schema.NullOr(QuietHours), { default: () => null }),
  template: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
  enabled: Schema.optionalWith(Schema.Boolean, { default: () => true }),
})
export type CreateRuleBody = typeof CreateRuleBody.Type

export const UpdateRuleBody = Schema.Struct({
  channelId: Schema.optional(ChannelId),
  name: Schema.optional(NonEmptyString),
  trigger: Schema.optional(TriggerConfig),
  extractorKey: Schema.optional(Schema.NullOr(ExtractorKey)),
  deliveryMode: Schema.optional(DeliveryMode),
  digestCron: Schema.optional(Schema.NullOr(CronExpression)),
  throttleSeconds: Schema.optional(NonNegativeInt),
  quietHours: Schema.optional(Schema.NullOr(QuietHours)),
  template: Schema.optional(Schema.NullOr(Schema.String)),
  enabled: Schema.optional(Schema.Boolean),
})
export type UpdateRuleBody = typeof UpdateRuleBody.Type

export const RuleIdParameters = Schema.Struct({ ruleId: RuleId })
export const RuleMonitorParameters = Schema.Struct({ monitorId: MonitorId })

export const RuleDto = Schema.Struct({
  id: RuleId,
  monitorId: MonitorId,
  channelId: ChannelId,
  name: Schema.String,
  trigger: TriggerConfig,
  extractorKey: Schema.NullOr(Schema.String),
  deliveryMode: DeliveryMode,
  digestCron: Schema.NullOr(Schema.String),
  throttleSeconds: NonNegativeInt,
  quietHours: Schema.NullOr(QuietHours),
  template: Schema.NullOr(Schema.String),
  enabled: Schema.Boolean,
  createdAt: Schema.String,
  updatedAt: Schema.String,
})
export type RuleDto = typeof RuleDto.Type

export const RuleListDto = Schema.Struct({ items: Schema.Array(RuleDto) })
