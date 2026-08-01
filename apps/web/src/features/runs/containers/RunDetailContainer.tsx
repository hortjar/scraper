import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ErrorState, LoadingState } from "../../../components/organisms"
import { cn } from "../../../lib/utils"
import { runDetailQueryOptions } from "../api"
import { RunFieldValuesTable } from "../components/RunFieldValuesTable"
import { RunScreenshotCard } from "../components/RunScreenshotCard"
import { RunSummaryCard } from "../components/RunSummaryCard"
import { toRunDetail } from "../transforms"

export interface RunDetailContainerProperties {
  readonly runId: string
  readonly className?: string
}

export const RunDetailContainer = ({ runId, className }: RunDetailContainerProperties) => {
  const { t } = useTranslation("runs")
  const query = useQuery(runDetailQueryOptions(runId))

  if (query.isPending) return <LoadingState className={className} />
  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title={t("list.errorTitle")}
        onRetry={() => {
          void query.refetch()
        }}
        className={className}
      />
    )
  }

  const run = toRunDetail(query.data)

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <RunSummaryCard run={run} />
      <div className="flex flex-col gap-3">
        <h2 className="text-heading text-ink">{t("fields.title")}</h2>
        <RunFieldValuesTable fields={run.fields} />
      </div>
      <RunScreenshotCard screenshotUrl={run.screenshotUrl} />
    </div>
  )
}
