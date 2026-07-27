import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { MetricTile } from "../../../components/molecules/MetricTile"
import { MONITOR_STATUS } from "../../../components/molecules/StatusPill.constants"
import { EmptyState } from "../../../components/organisms/EmptyState"
import { ErrorState } from "../../../components/organisms/ErrorState"
import { LoadingState } from "../../../components/organisms/LoadingState"
import { Button } from "../../../components/ui/Button"
import { monitorListQueryOptions } from "../api"
import { MonitorSummaryList } from "../components/MonitorSummaryList"
import { DASHBOARD_LIMIT, toMonitorStatus } from "../constants"

export const DashboardMonitors = () => {
  const { t } = useTranslation("monitors")
  const query = useQuery(monitorListQueryOptions({ limit: DASHBOARD_LIMIT }))

  if (query.isPending) return <LoadingState rows={3} />

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title={t("list.errorTitle")}
        onRetry={() => {
          void query.refetch()
        }}
      />
    )
  }

  const monitors = query.data.items

  if (monitors.length === 0) {
    return (
      <EmptyState
        title={t("list.emptyTitle")}
        description={t("list.emptyDescription")}
        action={
          <Button asChild variant="primary">
            <Link to="/monitors/new">{t("actions.create")}</Link>
          </Button>
        }
      />
    )
  }

  const statuses = monitors.map((monitor) => toMonitorStatus(monitor.status))
  const failing = statuses.filter((status) => status === MONITOR_STATUS.failing).length
  const paused = statuses.filter((status) => status === MONITOR_STATUS.paused).length

  return (
    <section className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricTile label={t("dashboard.totalLabel")} value={String(monitors.length)} />
        <MetricTile label={t("dashboard.failingLabel")} value={String(failing)} />
        <MetricTile label={t("dashboard.pausedLabel")} value={String(paused)} />
      </div>

      <MonitorSummaryList monitors={monitors} />

      <div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/monitors">{t("dashboard.viewAll")}</Link>
        </Button>
      </div>
    </section>
  )
}
