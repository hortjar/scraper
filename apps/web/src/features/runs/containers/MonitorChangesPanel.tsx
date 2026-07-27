import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { EmptyState, ErrorState, LoadingState } from "../../../components/organisms"
import { cn } from "../../../lib/utils"
import { monitorChangesQueryOptions } from "../api"
import { ChangesList } from "../components/ChangesList"
import { toChangeSummary } from "../transforms"
import type { ChangeSummary } from "../types"

export interface MonitorChangesPanelProperties {
  readonly monitorId: string
  readonly className?: string
}

export const MonitorChangesPanel = ({ monitorId, className }: MonitorChangesPanelProperties) => {
  const { t } = useTranslation("runs")
  const query = useQuery(monitorChangesQueryOptions(monitorId))
  const changes: readonly ChangeSummary[] = (query.data?.items ?? []).map((item) =>
    toChangeSummary(item),
  )

  const retry = (): void => {
    void query.refetch()
  }

  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <h2 className="text-heading text-ink">{t("changes.title")}</h2>
      {query.isPending ? <LoadingState /> : null}
      {query.isError ? (
        <ErrorState error={query.error} title={t("changes.list.errorTitle")} onRetry={retry} />
      ) : null}
      {!query.isPending && !query.isError && changes.length === 0 ? (
        <EmptyState
          title={t("changes.list.emptyTitle")}
          description={t("changes.list.emptyDescription")}
        />
      ) : null}
      {!query.isPending && !query.isError && changes.length > 0 ? (
        <ChangesList changes={changes} />
      ) : null}
    </section>
  )
}
