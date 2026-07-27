import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { RelativeTime } from "../../../components/molecules/RelativeTime"
import { StatusPill } from "../../../components/molecules/StatusPill"
import { DataTable, type DataTableColumn } from "../../../components/organisms/DataTable"
import { Badge } from "../../../components/ui/Badge"
import { useDensity } from "../../../stores/ui"
import { SCHEDULE_KIND, toMonitorStatus } from "../constants"
import { asText } from "../nullable"
import type { MonitorListItem } from "../types"

import { MonitorRowActions } from "./MonitorRowActions"

export interface MonitorsTableProperties {
  readonly monitors: readonly MonitorListItem[]
  readonly onRunNow: (monitorId: string) => void
  readonly onDelete: (monitorId: string) => void
}

export const MonitorsTable = ({ monitors, onRunNow, onDelete }: MonitorsTableProperties) => {
  const { t } = useTranslation("monitors")
  const density = useDensity()

  const columns: readonly DataTableColumn<MonitorListItem>[] = [
    {
      id: "name",
      header: t("columns.name"),
      cell: (row) => (
        <Link
          to="/monitors/$monitorId"
          params={{ monitorId: row.id }}
          className="flex min-w-0 flex-col gap-0.5"
        >
          <span className="truncate font-medium text-ink">{row.name}</span>
          <span className="truncate text-mono-micro text-ink-subtle">{row.url}</span>
        </Link>
      ),
    },
    {
      id: "status",
      header: t("columns.status"),
      cell: (row) => <StatusPill status={toMonitorStatus(row.status)} />,
    },
    {
      id: "schedule",
      header: t("columns.schedule"),
      cell: (row) =>
        row.schedule.kind === SCHEDULE_KIND.cron
          ? t("schedule.summaryCron", { expression: row.schedule.expression })
          : t("schedule.summaryInterval", { seconds: row.schedule.intervalSeconds }),
    },
    {
      id: "nextRun",
      header: t("columns.nextRun"),
      cell: (row) => {
        const nextRunAt = asText(row.nextRunAt)
        return nextRunAt === undefined ? (
          <span className="text-ink-subtle">{t("detail.never")}</span>
        ) : (
          <RelativeTime value={nextRunAt} />
        )
      },
    },
    {
      id: "tags",
      header: t("columns.tags"),
      cell: (row) => (
        <span className="flex flex-wrap gap-1">
          {row.tags.map((tag) => (
            <Badge key={tag} tone="outline">
              {tag}
            </Badge>
          ))}
        </span>
      ),
    },
    {
      id: "actions",
      header: t("columns.actions"),
      align: "end",
      cell: (row) => (
        <MonitorRowActions
          monitorId={row.id}
          onRunNow={() => {
            onRunNow(row.id)
          }}
          onDelete={() => {
            onDelete(row.id)
          }}
        />
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={monitors}
      getRowId={(row) => row.id}
      caption={t("list.caption")}
      density={density}
    />
  )
}
