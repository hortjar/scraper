import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ErrorState } from "../../../components/organisms/ErrorState"
import { LoadingState } from "../../../components/organisms/LoadingState"
import { Button } from "../../../components/ui/Button"
import { monitorQueryOptions } from "../api"
import { DeleteMonitorDialog } from "../components/DeleteMonitorDialog"
import { MonitorActivityPlaceholder } from "../components/MonitorActivityPlaceholder"
import { MonitorExtractors } from "../components/MonitorExtractors"
import { MonitorNotice } from "../components/MonitorNotice"
import { MonitorOverview } from "../components/MonitorOverview"
import { useMonitorActions } from "../hooks/use-monitor-actions"
import { useMonitorNotice } from "../hooks/use-monitor-notice"

export interface MonitorDetailViewProperties {
  readonly monitorId: string
  readonly confirmingDelete: boolean
  readonly onConfirmDeleteChange: (isOpen: boolean) => void
}

export const MonitorDetailView = ({
  monitorId,
  confirmingDelete,
  onConfirmDeleteChange,
}: MonitorDetailViewProperties) => {
  const { t } = useTranslation("monitors")
  const navigate = useNavigate()
  const notice = useMonitorNotice()
  const actions = useMonitorActions(notice)

  const query = useQuery(monitorQueryOptions(monitorId))

  if (query.isPending) return <LoadingState rows={3} />

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

  const monitor = query.data

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          disabled={actions.runPending}
          onClick={() => {
            actions.runNow(monitorId)
          }}
        >
          {t("actions.runNow")}
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link to="/monitors/$monitorId/edit" params={{ monitorId }}>
            {t("actions.edit")}
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onConfirmDeleteChange(true)
          }}
        >
          {t("actions.delete")}
        </Button>
      </div>

      <MonitorOverview monitor={monitor} />
      <MonitorExtractors extractors={monitor.extractors} />
      <MonitorActivityPlaceholder monitorId={monitorId} />

      <DeleteMonitorDialog
        monitorName={confirmingDelete ? monitor.name : undefined}
        pending={actions.deletePending}
        onCancel={() => {
          onConfirmDeleteChange(false)
        }}
        onConfirm={() => {
          actions.remove(monitorId, () => {
            onConfirmDeleteChange(false)
            void navigate({ to: "/monitors" })
          })
        }}
      />

      <MonitorNotice notice={notice.notice} onDismiss={notice.dismiss} />
    </div>
  )
}
