import { TEMPLATE_EACH_PATTERN, TEMPLATE_VARIABLE_PATTERN } from "./template.constants.js"

const resolvePath = (context: unknown, path: string): unknown => {
  let current: unknown = context
  for (const key of path.split(".")) {
    const record = asRecord(current)
    if (!Object.hasOwn(record, key)) return undefined
    current = record[key]
  }
  return current
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {}

const stringify = (value: unknown): string => {
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  return ""
}

const substituteVariables = (template: string, context: Record<string, unknown>): string =>
  template.replace(TEMPLATE_VARIABLE_PATTERN, (_match, path: string) =>
    stringify(resolvePath(context, path)),
  )

export const renderTemplate = (template: string, context: Record<string, unknown>): string => {
  const withEachExpanded = template.replace(
    TEMPLATE_EACH_PATTERN,
    (_match, path: string, inner: string) => {
      const items = resolvePath(context, path)
      if (!Array.isArray(items)) return ""
      return items
        .map((item: unknown) => renderTemplate(inner, { ...context, ...asRecord(item) }))
        .join("")
    },
  )
  return substituteVariables(withEachExpanded, context)
}

export const hasBalancedEachBlocks = (template: string): boolean => {
  const opens = template.match(/\{\{#each\s+[\w.]+\s*\}\}/g)?.length ?? 0
  const closes = template.match(/\{\{\/each\}\}/g)?.length ?? 0
  return opens === closes
}
