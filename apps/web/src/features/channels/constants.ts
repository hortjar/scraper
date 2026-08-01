export const CHANNEL_FIELD_TYPE = {
  string: "string",
  number: "number",
  boolean: "boolean",
  select: "select",
  secret: "secret",
  url: "url",
} as const

export const DELIVERY_STATUS = {
  pending: "pending",
  sent: "sent",
  failed: "failed",
  suppressed: "suppressed",
} as const

export const CHECKED_VALUE = "true"
export const UNCHECKED_VALUE = "false"

export const EMPTY_VALUE_MARK = "—"
