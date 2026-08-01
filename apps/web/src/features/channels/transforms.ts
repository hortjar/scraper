import { CHANNEL_FIELD_TYPE, CHECKED_VALUE, UNCHECKED_VALUE } from "./constants"
import { asNumber, asString } from "./nullable"
import type {
  ChannelFieldResponse,
  ChannelFormValues,
  ChannelResponse,
  ChannelSummary,
  DeliveryResponse,
  DeliverySummary,
} from "./types"

export const toChannelSummary = (item: ChannelResponse): ChannelSummary => ({
  id: item.id,
  kind: item.kind,
  name: item.name,
  enabled: item.enabled,
  hasSecret: item.hasSecret,
  failureCount: item.failureCount,
  verifiedAt: asString(item.verifiedAt),
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  config: item.config,
})

export const toDeliverySummary = (item: DeliveryResponse): DeliverySummary => ({
  id: item.id,
  ruleId: item.ruleId,
  channelId: item.channelId,
  monitorId: item.monitorId,
  status: item.status,
  attempts: asNumber(item.attempts) ?? 0,
  lastError: asString(item.lastError),
  suppressedReason: asString(item.suppressedReason),
  sentAt: asString(item.sentAt),
  createdAt: item.createdAt,
})

const asFormValue = (value: unknown): string => {
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  if (typeof value === "boolean") return value ? CHECKED_VALUE : UNCHECKED_VALUE
  return ""
}

export const toFormValues = (
  fields: readonly ChannelFieldResponse[],
  config: Readonly<Record<string, unknown>>,
): ChannelFormValues =>
  Object.fromEntries(fields.map((field) => [field.name, asFormValue(config[field.name])]))

const toConfigValue = (field: ChannelFieldResponse, raw: string): unknown => {
  if (field.type === CHANNEL_FIELD_TYPE.boolean) return raw === CHECKED_VALUE
  if (field.type === CHANNEL_FIELD_TYPE.number) return Number(raw)
  return raw
}

export const toConfigPayload = (
  fields: readonly ChannelFieldResponse[],
  values: ChannelFormValues,
): Readonly<Record<string, unknown>> => {
  const entries = fields.flatMap((field) => {
    const raw = values[field.name] ?? ""
    if (raw === "" && field.secret) return []
    if (raw === "" && !field.required) return []
    return [[field.name, toConfigValue(field, raw)] as const]
  })
  return Object.fromEntries(entries)
}

export const missingRequiredFields = (
  fields: readonly ChannelFieldResponse[],
  values: ChannelFormValues,
  hasStoredSecret: boolean,
): readonly string[] =>
  fields
    .filter((field) => {
      if (!field.required) return false
      if (hasStoredSecret && field.secret) return false
      return (values[field.name] ?? "") === ""
    })
    .map((field) => field.name)
