export const asString = (value: unknown): string | null =>
  typeof value === "string" ? value : null

export const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null

export const asBoolean = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null

export const asStringList = (value: unknown): readonly string[] | null =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : null
