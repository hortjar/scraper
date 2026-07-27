import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AppShell } from "../../components/layouts/AppShell"
import { Button } from "../../components/ui/Button"
import { MonitorsList, validateMonitorsSearch } from "../../features/monitors"

const MonitorsIndexRoute = () => {
  const { t } = useTranslation("monitors")
  const search = Route.useSearch()

  return (
    <AppShell
      title={t("title")}
      description={t("subtitle")}
      actions={
        <Button asChild variant="primary" size="sm">
          <Link to="/monitors/new">{t("actions.create")}</Link>
        </Button>
      }
    >
      <MonitorsList search={search} />
    </AppShell>
  )
}

export const Route = createFileRoute("/_app/monitors/")({
  component: MonitorsIndexRoute,
  validateSearch: validateMonitorsSearch,
})
