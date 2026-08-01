export const NUMERIC_CHANGE_COLUMNS = [
  "oldNumber",
  "newNumber",
  "deltaAbsolute",
  "deltaPercent",
] as const

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value !== "string") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const withNumericColumns = (
  row: Record<string, unknown>,
  columns: readonly string[],
): Record<string, unknown> => {
  const converted: Record<string, unknown> = { ...row }
  for (const column of columns) {
    if (Object.hasOwn(converted, column)) converted[column] = asNumber(converted[column])
  }
  return converted
}

export const toDomainChange = (row: Record<string, unknown>): Record<string, unknown> =>
  withNumericColumns(row, NUMERIC_CHANGE_COLUMNS)
