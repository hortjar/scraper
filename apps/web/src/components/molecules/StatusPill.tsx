import { CircleAlertIcon, CircleCheckIcon, CirclePauseIcon, CircleXIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "../../lib/utils"
import { Badge, type BadgeProps } from "../ui/Badge"

export const MONITOR_STATUS = {
  ok: "ok",
  degraded: "degraded",
  failing: "failing",
  paused: "paused",
} as const

export type MonitorStatus = (typeof MONITOR_STATUS)[keyof typeof MONITOR_STATUS]

const STATUS_TONE: Readonly<Record<MonitorStatus, NonNullable<BadgeProps["tone"]>>> = {
  ok: "positive",
  degraded: "warning",
  failing: "negative",
  paused: "neutral",
}

const STATUS_ICON = {
  ok: CircleCheckIcon,
  degraded: CircleAlertIcon,
  failing: CircleXIcon,
  paused: CirclePauseIcon,
} as const

const STATUS_KEY = {
  ok: "status.ok",
  degraded: "status.degraded",
  failing: "status.failing",
  paused: "status.paused",
} as const

const STATUS_DOT: Readonly<Record<MonitorStatus, string>> = {
  ok: "bg-positive",
  degraded: "bg-warning",
  failing: "bg-negative",
  paused: "bg-ink-subtle",
}

export interface StatusPillProps {
  readonly status: MonitorStatus
  readonly className?: string
}

export const StatusPill = ({ status, className }: StatusPillProps) => {
  const { t } = useTranslation("common")
  const Icon = STATUS_ICON[status]

  return (
    <Badge tone={STATUS_TONE[status]} className={cn("gap-1.5", className)}>
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} aria-hidden="true" />
      <Icon className="size-3" aria-hidden="true" />
      {t(STATUS_KEY[status])}
    </Badge>
  )
}
