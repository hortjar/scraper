import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { RelativeTime } from "../../../components/molecules/RelativeTime"
import { DataTable, type DataTableColumn } from "../../../components/organisms"
import { Button } from "../../../components/ui"
import { EMPTY_VALUE_MARK } from "../constants"
import type { ChannelSummary } from "../types"

import { ChannelStatusBadge } from "./ChannelStatusBadge"

export interface ChannelsTableProperties {
  readonly channels: readonly ChannelSummary[]
  readonly onTest: (channel: ChannelSummary) => void
  readonly testingId: string | null
  readonly className?: string
}

export const ChannelsTable = ({
  channels,
  onTest,
  testingId,
  className,
}: ChannelsTableProperties) => {
  const { t } = useTranslation("channels")

  const columns: readonly DataTableColumn<ChannelSummary>[] = [
    {
      id: "name",
      header: t("columns.name"),
      cell: (channel) => (
        <Link
          to="/channels/$channelId/edit"
          params={{ channelId: channel.id }}
          className="text-ink hover:text-brand-ink"
        >
          {channel.name}
        </Link>
      ),
    },
    {
      id: "kind",
      header: t("columns.kind"),
      cell: (channel) => <span className="font-mono text-mono-data">{channel.kind}</span>,
    },
    {
      id: "status",
      header: t("columns.status"),
      cell: (channel) => <ChannelStatusBadge channel={channel} />,
    },
    {
      id: "verifiedAt",
      header: t("columns.verifiedAt"),
      cell: (channel) =>
        channel.verifiedAt === null ? (
          EMPTY_VALUE_MARK
        ) : (
          <RelativeTime value={channel.verifiedAt} />
        ),
    },
    {
      id: "actions",
      header: t("columns.actions"),
      align: "end",
      cell: (channel) => (
        <Button
          variant="secondary"
          size="sm"
          disabled={testingId === channel.id}
          onClick={() => {
            onTest(channel)
          }}
        >
          {t("actions.test")}
        </Button>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={channels}
      getRowId={(channel) => channel.id}
      caption={t("list.caption")}
      className={className}
    />
  )
}
