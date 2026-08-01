import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ErrorState, LoadingState } from "../../../components/organisms"
import { adminStatsQueryOptions } from "../api"
import { StatsGrid } from "../components/StatsGrid"

export const AdminOverview = () => {
  const { t } = useTranslation("admin")
  const query = useQuery(adminStatsQueryOptions())

  if (query.isPending) return <LoadingState />
  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title={t("errorTitle")}
        onRetry={() => {
          void query.refetch()
        }}
      />
    )
  }

  return <StatsGrid stats={query.data} />
}
