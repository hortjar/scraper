export const asText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined
