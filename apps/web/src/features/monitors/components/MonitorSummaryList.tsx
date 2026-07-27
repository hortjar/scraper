import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { RelativeTime } from "../../../components/molecules/RelativeTime"
import { StatusPill } from "../../../components/molecules/StatusPill"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/Card"
import { toMonitorStatus } from "../constants"
import { asText } from "../nullable"
import type { MonitorListItem } from "../types"

export interface MonitorSummaryListProperties {
  readonly monitors: readonly MonitorListItem[]
}

export const MonitorSummaryList = ({ monitors }: MonitorSummaryListProperties) => {
  const { t } = useTranslation("monitors")

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.title")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul>
          {monitors.map((monitor) => {
            const lastRunAt = asText(monitor.lastRunAt)

            return (
              <li key={monitor.id} className="border-b border-line last:border-0">
                <Link
                  to="/monitors/$monitorId"
                  params={{ monitorId: monitor.id }}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-sunken"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-medium text-ink">{monitor.name}</span>
                    <span className="truncate text-mono-micro text-ink-subtle">{monitor.url}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    {lastRunAt === undefined ? null : <RelativeTime value={lastRunAt} />}
                    <StatusPill status={toMonitorStatus(monitor.status)} />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
