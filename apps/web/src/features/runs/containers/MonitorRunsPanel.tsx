import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { EmptyState, ErrorState, LoadingState } from "../../../components/organisms"
import { cn } from "../../../lib/utils"
import { useDensity } from "../../../stores/ui"
import { monitorRunsQueryOptions } from "../api"
import { RunsTable } from "../components/RunsTable"
import { toRunSummary } from "../transforms"
import type { RunSummary } from "../types"

export interface MonitorRunsPanelProperties {
  readonly monitorId: string
  readonly className?: string
}

export const MonitorRunsPanel = ({ monitorId, className }: MonitorRunsPanelProperties) => {
  const { t } = useTranslation("runs")
  const density = useDensity()
  const navigate = useNavigate()
  const query = useQuery(monitorRunsQueryOptions(monitorId))
  const runs: readonly RunSummary[] = (query.data?.items ?? []).map((item) => toRunSummary(item))

  const selectRun = (run: RunSummary): void => {
    void navigate({ to: "/runs/$runId", params: { runId: run.id } })
  }

  const retry = (): void => {
    void query.refetch()
  }

  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <h2 className="text-heading text-ink">{t("title")}</h2>
      {query.isPending ? <LoadingState /> : null}
      {query.isError ? (
        <ErrorState error={query.error} title={t("list.errorTitle")} onRetry={retry} />
      ) : null}
      {!query.isPending && !query.isError && runs.length === 0 ? (
        <EmptyState title={t("list.emptyTitle")} description={t("list.emptyDescription")} />
      ) : null}
      {!query.isPending && !query.isError && runs.length > 0 ? (
        <RunsTable runs={runs} density={density} onSelectRun={selectRun} />
      ) : null}
    </section>
  )
}
