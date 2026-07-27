import { useTranslation } from "react-i18next"

import { ErrorState } from "../../../components/organisms/ErrorState"
import { LoadingState } from "../../../components/organisms/LoadingState"
import { Button } from "../../../components/ui/Button"
import { SessionsList } from "../components/SessionsList"
import { useRevokeAllSessions, useRevokeSession, useSessions } from "../use-sessions"

const MIN_SESSIONS_FOR_REVOKE_ALL = 1

export const SessionsSettingsContainer = () => {
  const { t } = useTranslation("settings")
  const sessions = useSessions()
  const revokeSession = useRevokeSession()
  const revokeAll = useRevokeAllSessions()

  if (sessions.isPending) return <LoadingState rows={2} />
  if (sessions.isError) {
    return (
      <ErrorState
        error={sessions.error}
        onRetry={() => {
          void sessions.refetch()
        }}
      />
    )
  }

  const revokingId = revokeSession.isPending ? revokeSession.variables.path.sessionId : undefined

  return (
    <div className="flex flex-col gap-4">
      <SessionsList
        sessions={sessions.data.items}
        revokingId={revokingId}
        onRevoke={(sessionId) => {
          revokeSession.mutate({ path: { sessionId } })
        }}
      />
      {sessions.data.items.length > MIN_SESSIONS_FOR_REVOKE_ALL ? (
        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          disabled={revokeAll.isPending}
          onClick={() => {
            revokeAll.mutate({})
          }}
        >
          {t("sessions.revokeAll")}
        </Button>
      ) : null}
    </div>
  )
}
