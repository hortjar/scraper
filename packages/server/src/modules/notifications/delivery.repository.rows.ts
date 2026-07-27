const TIMESTAMP_COLUMNS = ["sentAt", "createdAt"] as const

const asDate = (value: unknown): Date | null => {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value
  return typeof value === "string" || typeof value === "number" ? new Date(value) : null
}

export const timestampParameter = (value: Date | null | undefined): string | null =>
  value === null || value === undefined ? null : value.toISOString()

export const withDeliveryDates = (row: unknown): unknown => {
  if (row === null || typeof row !== "object") return row
  const source = row as Record<string, unknown>
  const coerced: Record<string, unknown> = { ...source }
  for (const column of TIMESTAMP_COLUMNS) coerced[column] = asDate(source[column])
  return coerced
}
