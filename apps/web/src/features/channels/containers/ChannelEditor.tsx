import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ErrorState, LoadingState } from "../../../components/organisms"
import { channelKindsQueryOptions, channelListQueryOptions } from "../api"
import { toChannelSummary } from "../transforms"

import { ChannelEditorForm } from "./ChannelEditorForm"

export interface ChannelEditorProperties {
  readonly channelId?: string
}

export const ChannelEditor = ({ channelId }: ChannelEditorProperties) => {
  const { t } = useTranslation("channels")
  const kinds = useQuery(channelKindsQueryOptions())
  const channels = useQuery(channelListQueryOptions())

  if (kinds.isPending || channels.isPending) return <LoadingState />

  if (kinds.isError) {
    return (
      <ErrorState
        error={kinds.error}
        title={t("form.kindsErrorTitle")}
        onRetry={() => {
          void kinds.refetch()
        }}
      />
    )
  }

  if (channels.isError) {
    return (
      <ErrorState
        error={channels.error}
        title={t("list.errorTitle")}
        onRetry={() => {
          void channels.refetch()
        }}
      />
    )
  }

  const existing =
    channelId === undefined
      ? undefined
      : channels.data.items
          .map((item) => toChannelSummary(item))
          .find((channel) => channel.id === channelId)

  return <ChannelEditorForm kinds={kinds.data.items} existing={existing} />
}
