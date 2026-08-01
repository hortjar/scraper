import { useTranslation } from "react-i18next"

import { Badge, type BadgeProperties } from "../../../components/ui"
import { LOG_LEVEL } from "../constants"
import { logLevelKey } from "../label-keys"
import type { LogLevelName } from "../types"

const LEVEL_TONE: Readonly<Record<LogLevelName, NonNullable<BadgeProperties["tone"]>>> = {
  [LOG_LEVEL.debug]: "neutral",
  [LOG_LEVEL.info]: "info",
  [LOG_LEVEL.warn]: "warning",
  [LOG_LEVEL.error]: "negative",
  [LOG_LEVEL.fatal]: "negative",
}

const toneFor = (level: string): NonNullable<BadgeProperties["tone"]> => {
  const known: Partial<Record<string, NonNullable<BadgeProperties["tone"]>>> = LEVEL_TONE
  return known[level] ?? "neutral"
}

export interface LogLevelBadgeProperties {
  readonly level: string
}

export const LogLevelBadge = ({ level }: LogLevelBadgeProperties) => {
  const { t } = useTranslation("admin")

  return <Badge tone={toneFor(level)}>{t(logLevelKey(level))}</Badge>
}
