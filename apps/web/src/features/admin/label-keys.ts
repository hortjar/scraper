import { LOG_LEVEL } from "./constants"
import type { LogLevelName } from "./types"

export const LOG_LEVEL_LABEL = {
  [LOG_LEVEL.debug]: "logs.level.debug",
  [LOG_LEVEL.info]: "logs.level.info",
  [LOG_LEVEL.warn]: "logs.level.warn",
  [LOG_LEVEL.error]: "logs.level.error",
  [LOG_LEVEL.fatal]: "logs.level.fatal",
} as const satisfies Readonly<Record<LogLevelName, string>>

export const LOG_LEVEL_FALLBACK = "logs.level.info"

type LogLevelKey =
  (typeof LOG_LEVEL_LABEL)[keyof typeof LOG_LEVEL_LABEL] | typeof LOG_LEVEL_FALLBACK

export const logLevelKey = (level: string): LogLevelKey => {
  const known: Partial<Record<string, LogLevelKey>> = LOG_LEVEL_LABEL
  return known[level] ?? LOG_LEVEL_FALLBACK
}
