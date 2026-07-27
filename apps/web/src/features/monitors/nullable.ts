export const asText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined

export const asCount = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined
