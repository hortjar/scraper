import { Schema } from "effect"

import {
  CHANNEL_KIND,
  NOTIFICATION_EVENT,
  SUPPRESSION_REASON,
} from "../constants/channels.js"
import { DELIVERY_MODE, DELIVERY_STATUS, TRIGGER_KIND } from "../constants/domain-values.js"
import { ChangeId, ChannelId, DeliveryId, MonitorId, RuleId, RunId, UserId } from "./ids.js"
import {
  CronExpression,
  ExtractorKey,
  NonEmptyString,
  NonNegativeInt,
  QuietHourTime,
  Timezone,
} from "./primitives.js"

export const ChannelKind = Schema.Literal(
  CHANNEL_KIND.email,
  CHANNEL_KIND.webhook,
  CHANNEL_KIND.slack,
  CHANNEL_KIND.discord,
  CHANNEL_KIND.telegram,
)
export type ChannelKind = typeof ChannelKind.Type

export const NotificationChannelRecord = Schema.Struct({
  id: ChannelId,
  userId: UserId,
  kind: Schema.String,
  name: NonEmptyString,
  config: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  hasSecret: Schema.Boolean,
  verifiedAt: Schema.NullOr(Schema.DateFromSelf),
  enabled: Schema.Boolean,
  failureCount: NonNegativeInt,
  createdAt: Schema.DateFromSelf,
  updatedAt: Schema.DateFromSelf,
})
export type NotificationChannelRecord = typeof NotificationChannelRecord.Type

export const TriggerConfig = Schema.Union(
  Schema.Struct({ kind: Schema.Literal(TRIGGER_KIND.anyChange) }),
  Schema.Struct({ kind: Schema.Literal(TRIGGER_KIND.fieldChanged) }),
  Schema.Struct({
    kind: Schema.Literal(TRIGGER_KIND.numericThreshold),
    operator: Schema.Literal("gt", "gte", "lt", "lte", "eq"),
    value: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal(TRIGGER_KIND.percentChange),
    direction: Schema.Literal("up", "down", "any"),
    percent: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal(TRIGGER_KIND.textContains),
    text: NonEmptyString,
    caseSensitive: Schema.Boolean,
  }),
  Schema.Struct({
    kind: Schema.Literal(TRIGGER_KIND.textNotContains),
    text: NonEmptyString,
    caseSensitive: Schema.Boolean,
  }),
  Schema.Struct({
    kind: Schema.Literal(TRIGGER_KIND.regexMatch),
    pattern: NonEmptyString,
  }),
  Schema.Struct({
    kind: Schema.Literal(TRIGGER_KIND.availability),
    expect: Schema.Literal("available", "unavailable", "any"),
  }),
  Schema.Struct({ kind: Schema.Literal(TRIGGER_KIND.runFailed) }),
  Schema.Struct({ kind: Schema.Literal(TRIGGER_KIND.runRecovered) }),
  Schema.Struct({
    kind: Schema.Literal(TRIGGER_KIND.noChangeFor),
    hours: NonNegativeInt,
  }),
)
export type TriggerConfig = typeof TriggerConfig.Type

export const QuietHours = Schema.Struct({
  start: QuietHourTime,
  end: QuietHourTime,
  timezone: Timezone,
})
export type QuietHours = typeof QuietHours.Type

export const DeliveryMode = Schema.Literal(DELIVERY_MODE.immediate, DELIVERY_MODE.digest)
export type DeliveryMode = typeof DeliveryMode.Type

export const NotificationRule = Schema.Struct({
  id: RuleId,
  monitorId: MonitorId,
  channelId: ChannelId,
  name: NonEmptyString,
  trigger: TriggerConfig,
  extractorKey: Schema.NullOr(ExtractorKey),
  deliveryMode: DeliveryMode,
  digestCron: Schema.NullOr(CronExpression),
  throttleSeconds: NonNegativeInt,
  quietHours: Schema.NullOr(QuietHours),
  template: Schema.NullOr(Schema.String),
  enabled: Schema.Boolean,
  createdAt: Schema.DateFromSelf,
  updatedAt: Schema.DateFromSelf,
})
export type NotificationRule = typeof NotificationRule.Type

export const DeliveryStatus = Schema.Literal(
  DELIVERY_STATUS.pending,
  DELIVERY_STATUS.sent,
  DELIVERY_STATUS.failed,
  DELIVERY_STATUS.suppressed,
)
export type DeliveryStatus = typeof DeliveryStatus.Type

export const SuppressionReason = Schema.Literal(
  SUPPRESSION_REASON.throttled,
  SUPPRESSION_REASON.quietHours,
  SUPPRESSION_REASON.duplicate,
  SUPPRESSION_REASON.channelDisabled,
  SUPPRESSION_REASON.channelUnverified,
  SUPPRESSION_REASON.belowThreshold,
  SUPPRESSION_REASON.digestPending,
)
export type SuppressionReason = typeof SuppressionReason.Type

export const NotificationDelivery = Schema.Struct({
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
  sentAt: Schema.NullOr(Schema.DateFromSelf),
  createdAt: Schema.DateFromSelf,
})
export type NotificationDelivery = typeof NotificationDelivery.Type

export const NotificationEvent = Schema.Literal(
  NOTIFICATION_EVENT.change,
  NOTIFICATION_EVENT.digest,
  NOTIFICATION_EVENT.runFailed,
  NOTIFICATION_EVENT.runRecovered,
  NOTIFICATION_EVENT.monitorPaused,
  NOTIFICATION_EVENT.test,
)
export type NotificationEvent = typeof NotificationEvent.Type

export const ChangeSummary = Schema.Struct({
  key: Schema.NullOr(ExtractorKey),
  label: Schema.String,
  changeKind: Schema.String,
  oldValue: Schema.NullOr(Schema.String),
  newValue: Schema.NullOr(Schema.String),
  deltaAbsolute: Schema.NullOr(Schema.Number),
  deltaPercent: Schema.NullOr(Schema.Number),
})
export type ChangeSummary = typeof ChangeSummary.Type

export const NotificationMessage = Schema.Struct({
  event: NotificationEvent,
  locale: Schema.String,
  monitor: Schema.Struct({ id: MonitorId, name: Schema.String, url: Schema.String }),
  rule: Schema.Struct({ id: RuleId, name: Schema.String }),
  changes: Schema.Array(ChangeSummary),
  run: Schema.Struct({
    id: RunId,
    at: Schema.DateFromSelf,
    durationMs: NonNegativeInt,
    strategy: Schema.NullOr(Schema.String),
  }),
  links: Schema.Struct({
    monitor: Schema.String,
    run: Schema.String,
    unsubscribe: Schema.String,
  }),
  screenshotRef: Schema.NullOr(Schema.String),
})
export type NotificationMessage = typeof NotificationMessage.Type

export const ChannelDescriptor = Schema.Struct({
  kind: Schema.String,
  displayName: Schema.String,
  descriptionKey: Schema.String,
  icon: Schema.String,
  fields: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      labelKey: Schema.String,
      type: Schema.Literal("string", "number", "boolean", "select", "secret", "url"),
      required: Schema.Boolean,
      secret: Schema.Boolean,
      options: Schema.optional(Schema.Array(Schema.String)),
      placeholder: Schema.optional(Schema.String),
    }),
  ),
  capabilities: Schema.Struct({
    richText: Schema.Boolean,
    attachments: Schema.Boolean,
    maxLength: NonNegativeInt,
    supportsDigest: Schema.Boolean,
    supportsVerification: Schema.Boolean,
  }),
})
export type ChannelDescriptor = typeof ChannelDescriptor.Type
