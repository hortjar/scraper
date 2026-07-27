import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AppShell } from "../../components/layouts/AppShell"
import { Button } from "../../components/ui/Button"
import { MonitorEditorLoader } from "../../features/monitors"

const MonitorEditRoute = () => {
  const { t } = useTranslation("monitors")
  const { monitorId } = Route.useParams()

  return (
    <AppShell
      title={t("form.editTitle")}
      description={t("form.editSubtitle")}
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link to="/monitors/$monitorId" params={{ monitorId }}>
            {t("actions.backToMonitors")}
          </Link>
        </Button>
      }
    >
      <MonitorEditorLoader key={monitorId} monitorId={monitorId} />
    </AppShell>
  )
}

export const Route = createFileRoute("/_app/monitors/$monitorId/edit")({
  component: MonitorEditRoute,
})
