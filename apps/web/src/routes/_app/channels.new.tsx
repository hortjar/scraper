import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AppShell } from "../../components/layouts/AppShell"
import { ChannelEditor } from "../../features/channels"

const ChannelCreateRoute = () => {
  const { t } = useTranslation("channels")

  return (
    <AppShell title={t("form.createTitle")} description={t("form.createSubtitle")}>
      <ChannelEditor />
    </AppShell>
  )
}

export const Route = createFileRoute("/_app/channels/new")({ component: ChannelCreateRoute })
