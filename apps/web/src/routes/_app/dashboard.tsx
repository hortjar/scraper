import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AppShell } from "../../components/layouts/AppShell"
import { EmptyState } from "../../components/organisms/EmptyState"
import { Button } from "../../components/ui/Button"
import { DashboardMonitors } from "../../features/monitors"

const DashboardRoute = () => {
  const { t } = useTranslation("common")
  const { t: tMonitors } = useTranslation("monitors")
  const { t: tRuns } = useTranslation("runs")

  return (
    <AppShell
      title={t("nav.dashboard")}
      description={tMonitors("subtitle")}
      actions={
        <Button asChild variant="primary" size="sm">
          <Link to="/monitors/new">{tMonitors("actions.create")}</Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <DashboardMonitors />

        <section className="flex flex-col gap-3">
          <h2 className="text-heading text-ink">{tRuns("title")}</h2>
          <EmptyState
            title={tRuns("list.emptyTitle")}
            description={tRuns("list.emptyDescription")}
          />
        </section>
      </div>
    </AppShell>
  )
}

export const Route = createFileRoute("/_app/dashboard")({ component: DashboardRoute })
