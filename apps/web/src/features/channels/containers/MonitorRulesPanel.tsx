import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { EmptyState, ErrorState, LoadingState } from "../../../components/organisms"
import { channelListQueryOptions, monitorRulesQueryOptions } from "../api"
import { RulesTable } from "../components/RulesTable"
import { toChannelSummary } from "../transforms"

export interface MonitorRulesPanelProperties {
  readonly monitorId: string
  readonly className?: string | undefined
}

export const MonitorRulesPanel = ({ monitorId, className }: MonitorRulesPanelProperties) => {
  const { t } = useTranslation("channels")
  const rules = useQuery(monitorRulesQueryOptions(monitorId))
  const channels = useQuery(channelListQueryOptions())

  if (rules.isPending) return <LoadingState className={className} />
  if (rules.isError) {
    return (
      <ErrorState
        error={rules.error}
        title={t("rules.errorTitle")}
        onRetry={() => {
          void rules.refetch()
        }}
        className={className}
      />
    )
  }

  if (rules.data.items.length === 0) {
    return (
      <EmptyState
        title={t("rules.emptyTitle")}
        description={t("rules.emptyDescription")}
        className={className}
      />
    )
  }

  const channelNames = new Map(
    (channels.data?.items ?? [])
      .map((item) => toChannelSummary(item))
      .map((channel) => [channel.id, channel.name]),
  )

  return <RulesTable rules={rules.data.items} channelNames={channelNames} className={className} />
}
