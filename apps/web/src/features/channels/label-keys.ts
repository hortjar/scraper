import { DELIVERY_STATUS } from "./constants"
import type { DeliveryStatus } from "./types"

const SERVER_FIELD_LABEL = {
  "channels.fields.to": "fields.to",
  "channels.fields.url": "fields.url",
  "channels.fields.method": "fields.method",
  "channels.fields.secret": "fields.secret",
  "channels.fields.headers": "fields.headers",
  "channels.fields.webhookUrl": "fields.webhookUrl",
  "channels.fields.botToken": "fields.botToken",
  "channels.fields.chatId": "fields.chatId",
} as const

export const FIELD_LABEL_FALLBACK = "fields.unknown"

type FieldLabelKey =
  (typeof SERVER_FIELD_LABEL)[keyof typeof SERVER_FIELD_LABEL] | typeof FIELD_LABEL_FALLBACK

export const fieldLabelKey = (serverKey: string): FieldLabelKey => {
  const known: Partial<Record<string, FieldLabelKey>> = SERVER_FIELD_LABEL
  return known[serverKey] ?? FIELD_LABEL_FALLBACK
}

export const DELIVERY_STATUS_LABEL = {
  [DELIVERY_STATUS.pending]: "deliveries.status.pending",
  [DELIVERY_STATUS.sent]: "deliveries.status.sent",
  [DELIVERY_STATUS.failed]: "deliveries.status.failed",
  [DELIVERY_STATUS.suppressed]: "deliveries.status.suppressed",
} as const satisfies Readonly<Record<DeliveryStatus, string>>

const SUPPRESSION_REASON_LABEL = {
  throttled: "deliveries.suppressedReason.throttled",
  quiet_hours: "deliveries.suppressedReason.quietHours",
  duplicate: "deliveries.suppressedReason.duplicate",
  channel_disabled: "deliveries.suppressedReason.channelDisabled",
  channel_unverified: "deliveries.suppressedReason.channelUnverified",
  below_threshold: "deliveries.suppressedReason.belowThreshold",
  digest_pending: "deliveries.suppressedReason.digestPending",
} as const

export const SUPPRESSION_REASON_FALLBACK = "deliveries.suppressedReason.unknown"

type SuppressionReasonKey =
  | (typeof SUPPRESSION_REASON_LABEL)[keyof typeof SUPPRESSION_REASON_LABEL]
  | typeof SUPPRESSION_REASON_FALLBACK

export const suppressionReasonKey = (reason: string): SuppressionReasonKey => {
  const known: Partial<Record<string, SuppressionReasonKey>> = SUPPRESSION_REASON_LABEL
  return known[reason] ?? SUPPRESSION_REASON_FALLBACK
}
