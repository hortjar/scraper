import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AppShell } from "../../components/layouts/AppShell"
import { Button } from "../../components/ui/Button"
import { MonitorDetailView } from "../../features/monitors"
import { MonitorChangesPanel, MonitorRunsPanel } from "../../features/runs"

export interface DetailSearch {
  readonly confirmDelete?: true
}

const validateDetailSearch = (raw: Record<string, unknown>): DetailSearch =>
  raw.confirmDelete === true || raw.confirmDelete === "true" ? { confirmDelete: true } : {}

const MonitorDetailRoute = () => {
  const { t } = useTranslation("monitors")
  const { monitorId } = Route.useParams()
  const { confirmDelete } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <AppShell
      title={t("title")}
      description={t("detail.overviewTitle")}
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link to="/monitors">{t("actions.backToMonitors")}</Link>
        </Button>
      }
    >
      <MonitorDetailView
        key={monitorId}
        monitorId={monitorId}
        confirmingDelete={confirmDelete === true}
        onConfirmDeleteChange={(open) => {
          void navigate({ search: open ? { confirmDelete: true } : {} })
        }}
        activity={
          <div className="flex flex-col gap-6">
            <MonitorRunsPanel monitorId={monitorId} />
            <MonitorChangesPanel monitorId={monitorId} />
          </div>
        }
      />
    </AppShell>
  )
}

export const Route = createFileRoute("/_app/monitors/$monitorId")({
  component: MonitorDetailRoute,
  validateSearch: validateDetailSearch,
})
