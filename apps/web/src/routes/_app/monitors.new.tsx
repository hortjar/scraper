import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AppShell } from "../../components/layouts/AppShell"
import { Button } from "../../components/ui/Button"
import { MonitorEditor } from "../../features/monitors"

const MonitorsNewRoute = () => {
  const { t } = useTranslation("monitors")

  return (
    <AppShell
      title={t("form.createTitle")}
      description={t("form.createSubtitle")}
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link to="/monitors">{t("actions.backToMonitors")}</Link>
        </Button>
      }
    >
      <MonitorEditor />
    </AppShell>
  )
}

export const Route = createFileRoute("/_app/monitors/new")({ component: MonitorsNewRoute })
