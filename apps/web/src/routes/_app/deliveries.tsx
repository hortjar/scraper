import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AppShell } from "../../components/layouts/AppShell"
import { DeliveriesPanel } from "../../features/channels"

export interface DeliveriesSearch {
  readonly channelId: string
  readonly status: string
}

const validateSearch = (search: Record<string, unknown>): DeliveriesSearch => ({
  channelId: typeof search.channelId === "string" ? search.channelId : "",
  status: typeof search.status === "string" ? search.status : "",
})

const DeliveriesRoute = () => {
  const { t } = useTranslation("channels")
  const search = Route.useSearch()

  return (
    <AppShell title={t("deliveries.title")} description={t("deliveries.subtitle")}>
      <DeliveriesPanel query={{ channelId: search.channelId, status: search.status }} />
    </AppShell>
  )
}

export const Route = createFileRoute("/_app/deliveries")({
  validateSearch,
  component: DeliveriesRoute,
})
