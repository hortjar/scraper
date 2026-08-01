import { useTranslation } from "react-i18next"

import { MetricTile } from "../../../components/molecules"
import { DataTable, type DataTableColumn } from "../../../components/organisms"
import { Badge } from "../../../components/ui"
import type { AdminStats } from "../types"

type QueueRow = AdminStats["queues"][number]

export interface StatsGridProperties {
  readonly stats: AdminStats
}

export const StatsGrid = ({ stats }: StatsGridProperties) => {
  const { t } = useTranslation("admin")

  const columns: readonly DataTableColumn<QueueRow>[] = [
    {
      id: "name",
      header: t("stats.queueColumns.name"),
      cell: (row) => <span className="font-mono text-mono-data">{row.name}</span>,
    },
    {
      id: "waiting",
      header: t("stats.queueColumns.waiting"),
      numeric: true,
      align: "end",
      cell: (row) => row.waiting,
    },
    {
      id: "active",
      header: t("stats.queueColumns.active"),
      numeric: true,
      align: "end",
      cell: (row) => row.active,
    },
    {
      id: "delayed",
      header: t("stats.queueColumns.delayed"),
      numeric: true,
      align: "end",
      cell: (row) => row.delayed,
    },
    {
      id: "failed",
      header: t("stats.queueColumns.failed"),
      numeric: true,
      align: "end",
      cell: (row) => row.failed,
    },
    {
      id: "workers",
      header: t("stats.queueColumns.workers"),
      align: "end",
      cell: (row) =>
        row.workers === 0 ? (
          <Badge tone="negative">{t("stats.noConsumer")}</Badge>
        ) : (
          <span className="font-mono text-mono-data tabular-nums">{row.workers}</span>
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label={t("stats.users")} value={String(stats.users.total)} />
        <MetricTile label={t("stats.monitors")} value={String(stats.monitors.total)} />
        <MetricTile
          label={t("stats.runs", { hours: stats.windowHours })}
          value={String(stats.runs.total)}
        />
        <MetricTile label={t("stats.failed")} value={String(stats.runs.failed)} />
      </div>

      {stats.queues.some((queue) => queue.workers === 0) ? (
        <p className="rounded-md border border-negative/30 bg-negative-soft px-3 py-2 text-small text-negative-ink">
          {t("stats.noConsumerHint")}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        rows={stats.queues}
        getRowId={(row) => row.name}
        caption={t("stats.queueCaption")}
      />
    </div>
  )
}
