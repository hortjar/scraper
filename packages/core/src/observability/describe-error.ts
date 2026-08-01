import type { AppError } from "../errors/index.js"

const DESCRIBED_FIELDS = [
  "reason",
  "detail",
  "cause",
  "entity",
  "operation",
  "extractorKey",
  "selector",
  "transform",
  "url",
  "host",
  "queue",
  "channelKind",
  "httpStatus",
  "id",
] as const

const asText = (value: unknown): string => {
  if (typeof value === "string") return value
  if (value instanceof Error) return value.message
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export const describeAppError = (error: AppError): string => {
  const record = error as unknown as Readonly<Record<string, unknown>>
  const parts = DESCRIBED_FIELDS.filter(
    (field) => record[field] !== undefined && record[field] !== null && record[field] !== "",
  ).map((field) => `${field}=${asText(record[field])}`)

  return parts.length === 0 ? error._tag : `${error._tag} ${parts.join(" ")}`
}
