import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AppShell } from "../../components/layouts/AppShell"
import { EmptyState } from "../../components/organisms/EmptyState"
import { MonitorChangesPanel } from "../../features/runs"

export interface ChangesSearch {
  readonly monitorId: string
}

const validateSearch = (search: Record<string, unknown>): ChangesSearch => ({
  monitorId: typeof search.monitorId === "string" ? search.monitorId : "",
})

const ChangesRoute = () => {
  const { monitorId } = Route.useSearch()
  const { t } = useTranslation("runs")

  return (
    <AppShell title={t("changes.title")} description={t("changes.subtitle")}>
      {monitorId === "" ? (
        <EmptyState
          title={t("changes.missingMonitorTitle")}
          description={t("changes.missingMonitorDescription")}
        />
      ) : (
        <MonitorChangesPanel monitorId={monitorId} />
      )}
    </AppShell>
  )
}

export const Route = createFileRoute("/_app/changes")({
  validateSearch,
  component: ChangesRoute,
})
