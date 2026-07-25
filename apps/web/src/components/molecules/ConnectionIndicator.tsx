import { useTranslation } from "react-i18next"

import { cn } from "../../lib/utils"

import type { ConnectionState } from "./ConnectionIndicator.constants"

const STATE_DOT: Readonly<Record<ConnectionState, string>> = {
  connected: "bg-positive",
  reconnecting: "bg-warning animate-pulse",
  offline: "bg-negative",
}

const STATE_KEY = {
  connected: "connection.connected",
  reconnecting: "connection.reconnecting",
  offline: "connection.offline",
} as const

export interface ConnectionIndicatorProps {
  readonly state: ConnectionState
  readonly className?: string
}

export const ConnectionIndicator = ({ state, className }: ConnectionIndicatorProps) => {
  const { t } = useTranslation("common")

  return (
    <p
      aria-live="polite"
      className={cn("flex items-center gap-2 text-small text-ink-muted", className)}
    >
      <span className={cn("size-2 rounded-full", STATE_DOT[state])} aria-hidden="true" />
      <span className="sr-only">{t("connection.label")}</span>
      {t(STATE_KEY[state])}
    </p>
  )
}
