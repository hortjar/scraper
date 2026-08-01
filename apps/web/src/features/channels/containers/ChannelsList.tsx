import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { EmptyState, ErrorState, LoadingState } from "../../../components/organisms"
import { cn } from "../../../lib/utils"
import { channelListQueryOptions, channelListRootKey, testChannelMutationOptions } from "../api"
import { ChannelsTable } from "../components/ChannelsTable"
import { toChannelSummary } from "../transforms"
import type { ChannelSummary } from "../types"

export interface ChannelsListProperties {
  readonly className?: string
}

export const ChannelsList = ({ className }: ChannelsListProperties) => {
  const { t } = useTranslation("channels")
  const queryClient = useQueryClient()
  const [testingId, setTestingId] = useState<string | null>(null)
  const query = useQuery(channelListQueryOptions())

  const testChannel = useMutation({
    ...testChannelMutationOptions(),
    onSettled: () => {
      setTestingId(null)
      void queryClient.invalidateQueries({ queryKey: channelListRootKey() })
    },
  })

  if (query.isPending) return <LoadingState className={className} />
  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title={t("list.errorTitle")}
        onRetry={() => {
          void query.refetch()
        }}
        className={className}
      />
    )
  }

  const channels = query.data.items.map((item) => toChannelSummary(item))

  if (channels.length === 0) {
    return (
      <EmptyState
        title={t("list.emptyTitle")}
        description={t("list.emptyDescription")}
        className={className}
      />
    )
  }

  const handleTest = (channel: ChannelSummary) => {
    setTestingId(channel.id)
    testChannel.mutate({ path: { channelId: channel.id } })
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <ChannelsTable channels={channels} onTest={handleTest} testingId={testingId} />
    </div>
  )
}
