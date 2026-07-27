import { useTranslation } from "react-i18next"

import { EmptyState } from "../../../components/organisms/EmptyState"
import { ErrorState } from "../../../components/organisms/ErrorState"
import { LoadingState } from "../../../components/organisms/LoadingState"

export interface MonitorsListStatusProperties {
  readonly isPending: boolean
  readonly isEmpty: boolean
  readonly isFiltered: boolean
  readonly error: unknown
  readonly onRetry: () => void
}

export const MonitorsListStatus = ({
  isPending,
  isEmpty,
  isFiltered,
  error,
  onRetry,
}: MonitorsListStatusProperties) => {
  const { t } = useTranslation("monitors")

  if (isPending) return <LoadingState />

  if (error !== null) {
    return <ErrorState error={error} title={t("list.errorTitle")} onRetry={onRetry} />
  }

  if (!isEmpty) return null

  return (
    <EmptyState
      title={t(isFiltered ? "list.emptyFilteredTitle" : "list.emptyTitle")}
      description={t(isFiltered ? "list.emptyFilteredDescription" : "list.emptyDescription")}
    />
  )
}
