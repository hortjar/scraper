import { useTranslation } from "react-i18next"

import { DataTable, type DataTableColumn } from "../../../components/organisms"
import { Badge } from "../../../components/ui"
import type { RuleResponse } from "../types"

export interface RulesTableProperties {
  readonly rules: readonly RuleResponse[]
  readonly channelNames: ReadonlyMap<string, string>
  readonly className?: string | undefined
}

export const RulesTable = ({ rules, channelNames, className }: RulesTableProperties) => {
  const { t } = useTranslation("channels")

  const columns: readonly DataTableColumn<RuleResponse>[] = [
    { id: "name", header: t("rules.columns.name"), cell: (rule) => rule.name },
    {
      id: "trigger",
      header: t("rules.columns.trigger"),
      cell: (rule) => <span className="font-mono text-mono-data">{rule.trigger.kind}</span>,
    },
    {
      id: "channel",
      header: t("rules.columns.channel"),
      cell: (rule) => channelNames.get(rule.channelId) ?? t("rules.unknownChannel"),
    },
    {
      id: "mode",
      header: t("rules.columns.mode"),
      cell: (rule) =>
        t(rule.deliveryMode === "digest" ? "rules.mode.digest" : "rules.mode.immediate"),
    },
    {
      id: "status",
      header: t("rules.columns.status"),
      cell: (rule) => (
        <Badge tone={rule.enabled ? "positive" : "neutral"}>
          {t(rule.enabled ? "rules.status.enabled" : "rules.status.disabled")}
        </Badge>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={rules}
      getRowId={(rule) => rule.id}
      caption={t("rules.caption")}
      className={className}
    />
  )
}
