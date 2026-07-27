import { useTranslation } from "react-i18next"

import { RelativeTime } from "../../../components/molecules/RelativeTime"
import { DataTable, type DataTableColumn } from "../../../components/organisms/DataTable"
import { EmptyState } from "../../../components/organisms/EmptyState"
import { Badge } from "../../../components/ui/Badge"
import { Button } from "../../../components/ui/Button"
import { API_KEY_SCOPE_LABEL_KEY } from "../constants"
import { asText } from "../nullable"
import type { ApiKeyListItem } from "../types"

export interface ApiKeysListProperties {
  readonly apiKeys: readonly ApiKeyListItem[]
  readonly revokingId: string | undefined
  readonly onRevoke: (apiKeyId: string) => void
}

export const ApiKeysList = ({ apiKeys, revokingId, onRevoke }: ApiKeysListProperties) => {
  const { t } = useTranslation("settings")

  if (apiKeys.length === 0) return <EmptyState title={t("apiKeys.emptyTitle")} />

  const columns: readonly DataTableColumn<ApiKeyListItem>[] = [
    {
      id: "name",
      header: t("apiKeys.nameHeader"),
      cell: (key) => (
        <div className="flex flex-col">
          <span className="text-body text-ink">{key.name}</span>
          <span className="text-mono-micro text-ink-subtle">{key.prefix}</span>
        </div>
      ),
    },
    {
      id: "scopes",
      header: t("apiKeys.scopesLabel"),
      cell: (key) => (
        <div className="flex flex-wrap gap-1">
          {key.scopes.map((scope) => (
            <Badge key={scope} tone="outline">
              {t(API_KEY_SCOPE_LABEL_KEY[scope])}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: "lastUsed",
      header: t("apiKeys.lastUsedHeader"),
      cell: (key) => {
        const lastUsedAt = asText(key.lastUsedAt)
        return lastUsedAt === undefined ? (
          <span className="text-small text-ink-subtle">{t("apiKeys.neverUsed")}</span>
        ) : (
          <RelativeTime value={lastUsedAt} />
        )
      },
    },
    {
      id: "actions",
      header: t("apiKeys.actionsHeader"),
      align: "end",
      cell: (key) => (
        <Button
          variant="secondary"
          size="sm"
          disabled={revokingId === key.id}
          onClick={() => {
            onRevoke(key.id)
          }}
        >
          {t("apiKeys.revoke")}
        </Button>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={apiKeys}
      getRowId={(key) => key.id}
      caption={t("apiKeys.tableCaption")}
    />
  )
}
