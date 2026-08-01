import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AppShell } from "../../components/layouts/AppShell"
import { Button } from "../../components/ui/Button"
import { ChannelsList } from "../../features/channels"

const ChannelsIndexRoute = () => {
  const { t } = useTranslation("channels")

  return (
    <AppShell
      title={t("title")}
      description={t("subtitle")}
      actions={
        <Button asChild variant="primary" size="sm">
          <Link to="/channels/new">{t("actions.create")}</Link>
        </Button>
      }
    >
      <ChannelsList />
    </AppShell>
  )
}

export const Route = createFileRoute("/_app/channels/")({ component: ChannelsIndexRoute })
