import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AppShell } from "../../components/layouts/AppShell"
import { ChannelEditor } from "../../features/channels"

const ChannelEditRoute = () => {
  const { t } = useTranslation("channels")
  const { channelId } = Route.useParams()

  return (
    <AppShell title={t("form.editTitle")} description={t("form.editSubtitle")}>
      <ChannelEditor channelId={channelId} />
    </AppShell>
  )
}

export const Route = createFileRoute("/_app/channels/$channelId/edit")({
  component: ChannelEditRoute,
})
