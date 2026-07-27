import { Link } from "@tanstack/react-router"
import { MoreHorizontalIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "../../../components/ui/Button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/DropdownMenu"

export interface MonitorRowActionsProperties {
  readonly monitorId: string
  readonly onRunNow: () => void
  readonly onDelete: () => void
  readonly disabled?: boolean
}

export const MonitorRowActions = ({
  monitorId,
  onRunNow,
  onDelete,
  disabled,
}: MonitorRowActionsProperties) => {
  const { t } = useTranslation("monitors")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("actions.openMenu")} disabled={disabled}>
          <MoreHorizontalIcon className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to="/monitors/$monitorId" params={{ monitorId }}>
            {t("detail.overviewTitle")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/monitors/$monitorId/edit" params={{ monitorId }}>
            {t("actions.edit")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onRunNow}>{t("actions.runNow")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onDelete}>{t("actions.delete")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
