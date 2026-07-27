import { issuesByPath } from "../../lib/api"

export type FieldIssues = Readonly<Record<string, string>>

export const FIELD_PATH = {
  name: "name",
  url: "url",
  engine: "engine",
  contentSelector: "contentSelector",
  tags: "tags",
  schedule: "schedule",
  extractors: "extractors",
  ignoreRules: "ignoreRules",
} as const

const SEPARATOR = "."

export const joinPath = (...segments: readonly (string | number)[]): string =>
  segments.join(SEPARATOR)

export const schedulePath = (field: string): string => joinPath(FIELD_PATH.schedule, field)

export const extractorPath = (index: number, field?: string): string =>
  field === undefined
    ? joinPath(FIELD_PATH.extractors, index)
    : joinPath(FIELD_PATH.extractors, index, field)

export const ignoreRulePath = (index: number, field?: string): string =>
  field === undefined
    ? joinPath(FIELD_PATH.ignoreRules, index)
    : joinPath(FIELD_PATH.ignoreRules, index, field)

export const transformPath = (
  extractorIndex: number,
  transformIndex: number,
  field?: string,
): string =>
  field === undefined
    ? joinPath(FIELD_PATH.extractors, extractorIndex, "transforms", transformIndex)
    : joinPath(FIELD_PATH.extractors, extractorIndex, "transforms", transformIndex, field)

export const serverIssues = (error: unknown): FieldIssues => issuesByPath(error)

export const mergeIssues = (...sources: readonly FieldIssues[]): FieldIssues =>
  Object.fromEntries(sources.flatMap((source) => Object.entries(source)))

export const issueAt = (issues: FieldIssues, path: string): string | undefined => issues[path]

export const hasIssues = (issues: FieldIssues): boolean => Object.keys(issues).length > 0

export const issuesUnder = (issues: FieldIssues, prefix: string): FieldIssues =>
  Object.fromEntries(
    Object.entries(issues).filter(([path]) => path === prefix || path.startsWith(`${prefix}.`)),
  )
