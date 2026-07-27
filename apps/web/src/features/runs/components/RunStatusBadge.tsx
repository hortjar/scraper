import { CircleCheckIcon, CircleSlashIcon, CircleXIcon, LoaderCircleIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "../../../components/ui"
import { cn } from "../../../lib/utils"
import { RUN_STATUS } from "../constants"
import { RUN_STATUS_KEY, RUN_STATUS_TONE } from "../format"
import type { RunStatus } from "../types"

const STATUS_ICON = {
  [RUN_STATUS.running]: LoaderCircleIcon,
  [RUN_STATUS.success]: CircleCheckIcon,
  [RUN_STATUS.failed]: CircleXIcon,
  [RUN_STATUS.skipped]: CircleSlashIcon,
} as const

export interface RunStatusBadgeProperties {
  readonly status: RunStatus
  readonly className?: string
}

export const RunStatusBadge = ({ status, className }: RunStatusBadgeProperties) => {
  const { t } = useTranslation("runs")
  const Icon = STATUS_ICON[status]

  return (
    <Badge tone={RUN_STATUS_TONE[status]} className={cn("gap-1.5", className)}>
      <Icon
        className={cn("size-3", status === RUN_STATUS.running && "animate-spin")}
        aria-hidden="true"
      />
      {t(RUN_STATUS_KEY[status])}
    </Badge>
  )
}
