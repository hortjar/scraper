import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AppShell } from "../../components/layouts/AppShell"
import { RunDetailContainer } from "../../features/runs"

const RunDetailRoute = () => {
  const { runId } = Route.useParams()
  const { t } = useTranslation("runs")

  return (
    <AppShell title={t("detail.title")} description={t("detail.subtitle")}>
      <RunDetailContainer runId={runId} />
    </AppShell>
  )
}

export const Route = createFileRoute("/_app/runs/$runId")({ component: RunDetailRoute })
