import { LOG_LEVEL, PERSISTED_LOG_LEVELS } from "@scraper/core/constants"
import type { LogLevelName } from "@scraper/core/constants"

import { MAX_ANNOTATION_CHARS, MAX_MESSAGE_CHARS } from "./logs.constants.js"

export interface LogRecord {
  readonly at: string
  readonly level: LogLevelName
  readonly service: string
  readonly message: string
  readonly annotations: Readonly<Record<string, unknown>>
}

const LEVEL_BY_LABEL: Readonly<Record<string, LogLevelName>> = {
  trace: LOG_LEVEL.debug,
  debug: LOG_LEVEL.debug,
  info: LOG_LEVEL.info,
  warn: LOG_LEVEL.warn,
  warning: LOG_LEVEL.warn,
  error: LOG_LEVEL.error,
  fatal: LOG_LEVEL.fatal,
}

export const toLevelName = (label: string): LogLevelName =>
  LEVEL_BY_LABEL[label.toLowerCase()] ?? LOG_LEVEL.info

export const truncate = (value: string, max: number): string =>
  value.length <= max ? value : `${value.slice(0, max)}…`

export const cappedAnnotations = (
  annotations: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> =>
  Object.fromEntries(
    Object.entries(annotations).map(([key, value]) => [
      key,
      typeof value === "string" ? truncate(value, MAX_ANNOTATION_CHARS) : value,
    ]),
  )

export const makeRecord = (input: {
  readonly at: Date
  readonly levelLabel: string
  readonly service: string
  readonly message: string
  readonly annotations: Readonly<Record<string, unknown>>
}): LogRecord => ({
  at: input.at.toISOString(),
  level: toLevelName(input.levelLabel),
  service: input.service,
  message: truncate(input.message, MAX_MESSAGE_CHARS),
  annotations: cappedAnnotations(input.annotations),
})

const persisted = new Set<string>(PERSISTED_LOG_LEVELS)

export const isPersisted = (record: LogRecord): boolean => persisted.has(record.level)

export const parseRecord = (raw: string): LogRecord | null => {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) return null
    const candidate = parsed as Partial<LogRecord>
    if (typeof candidate.at !== "string" || typeof candidate.message !== "string") return null
    if (typeof candidate.level !== "string" || typeof candidate.service !== "string") return null
    return {
      at: candidate.at,
      level: toLevelName(candidate.level),
      service: candidate.service,
      message: candidate.message,
      annotations: candidate.annotations ?? {},
    }
  } catch {
    return null
  }
}
