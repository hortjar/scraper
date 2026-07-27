import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ErrorState } from "../../../components/organisms/ErrorState"
import { LoadingState } from "../../../components/organisms/LoadingState"
import { monitorQueryOptions } from "../api"

import { MonitorEditor } from "./MonitorEditor"

export interface MonitorEditorLoaderProperties {
  readonly monitorId: string
}

export const MonitorEditorLoader = ({ monitorId }: MonitorEditorLoaderProperties) => {
  const { t } = useTranslation("monitors")
  const query = useQuery(monitorQueryOptions(monitorId))

  if (query.isPending) return <LoadingState rows={4} />

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title={t("detail.errorTitle")}
        onRetry={() => {
          void query.refetch()
        }}
      />
    )
  }

  return <MonitorEditor monitor={query.data} />
}
