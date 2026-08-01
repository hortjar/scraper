import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { EmptyState, ErrorState, LoadingState } from "../../../components/organisms"
import { adminLogsQueryOptions, type LogQuery } from "../api"
import { LogTable } from "../components/LogTable"
import { LOG_SOURCE } from "../constants"

export interface AdminLogsProperties {
  readonly query: LogQuery
}

export const AdminLogs = ({ query }: AdminLogsProperties) => {
  const { t } = useTranslation("admin")
  const logs = useQuery(adminLogsQueryOptions(query))

  if (logs.isPending) return <LoadingState />
  if (logs.isError) {
    return (
      <ErrorState
        error={logs.error}
        title={t("logs.errorTitle")}
        onRetry={() => {
          void logs.refetch()
        }}
      />
    )
  }

  const note = t(
    logs.data.source === LOG_SOURCE.persisted
      ? "logs.sourceNote.persisted"
      : "logs.sourceNote.stream",
  )

  if (logs.data.items.length === 0) {
    return <EmptyState title={t("logs.emptyTitle")} description={t("logs.emptyDescription")} />
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-small text-ink-muted">{note}</p>
      <LogTable records={logs.data.items} />
    </div>
  )
}
