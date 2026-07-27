import { useTranslation } from "react-i18next"

import { RelativeTime } from "../../../components/molecules/RelativeTime"
import { DataTable, type DataTableColumn } from "../../../components/organisms/DataTable"
import { EmptyState } from "../../../components/organisms/EmptyState"
import { Badge } from "../../../components/ui/Badge"
import { Button } from "../../../components/ui/Button"
import { asText } from "../nullable"
import type { SessionListItem } from "../types"

export interface SessionsListProperties {
  readonly sessions: readonly SessionListItem[]
  readonly revokingId: string | undefined
  readonly onRevoke: (sessionId: string) => void
}

export const SessionsList = ({ sessions, revokingId, onRevoke }: SessionsListProperties) => {
  const { t } = useTranslation("settings")

  if (sessions.length === 0) return <EmptyState title={t("sessions.emptyTitle")} />

  const columns: readonly DataTableColumn<SessionListItem>[] = [
    {
      id: "device",
      header: t("sessions.deviceHeader"),
      cell: (session) => (
        <div className="flex flex-col">
          <span className="text-body text-ink">
            {asText(session.userAgent) ?? t("sessions.unknownDevice")}
          </span>
          <span className="text-mono-micro text-ink-subtle">
            {asText(session.ip) ?? t("sessions.unknownLocation")}
          </span>
        </div>
      ),
    },
    {
      id: "lastSeen",
      header: t("sessions.lastSeenHeader"),
      cell: (session) => <RelativeTime value={session.lastSeenAt} />,
    },
    {
      id: "status",
      header: t("sessions.statusHeader"),
      cell: (session) =>
        session.current ? <Badge tone="brand">{t("sessions.current")}</Badge> : null,
    },
    {
      id: "actions",
      header: t("sessions.actionsHeader"),
      align: "end",
      cell: (session) =>
        session.current ? null : (
          <Button
            variant="secondary"
            size="sm"
            disabled={revokingId === session.id}
            onClick={() => {
              onRevoke(session.id)
            }}
          >
            {t("sessions.revoke")}
          </Button>
        ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={sessions}
      getRowId={(session) => session.id}
      caption={t("sessions.tableCaption")}
    />
  )
}
