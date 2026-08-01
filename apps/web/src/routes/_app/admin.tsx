import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AppShell } from "../../components/layouts/AppShell"
import {
  AdminLogs,
  AdminOverview,
  ALL_VALUE,
  LOG_SOURCE,
  type LogQuery,
} from "../../features/admin"

const PERSISTED_FLAG = "true"

export interface AdminSearch {
  readonly level: string
  readonly service: string
  readonly source: string
}

const validateSearch = (search: Record<string, unknown>): AdminSearch => ({
  level: typeof search.level === "string" ? search.level : ALL_VALUE,
  service: typeof search.service === "string" ? search.service : ALL_VALUE,
  source: typeof search.source === "string" ? search.source : LOG_SOURCE.stream,
})

const toQuery = (search: AdminSearch): LogQuery => ({
  ...(search.level !== ALL_VALUE && { level: search.level }),
  ...(search.service !== ALL_VALUE && { service: search.service }),
  ...(search.source === LOG_SOURCE.persisted && { persisted: PERSISTED_FLAG }),
})

const AdminRoute = () => {
  const { t } = useTranslation("admin")
  const search = Route.useSearch()

  return (
    <AppShell title={t("title")} description={t("subtitle")}>
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-heading text-ink">{t("stats.title")}</h2>
          <AdminOverview />
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-heading text-ink">{t("logs.title")}</h2>
          <AdminLogs query={toQuery(search)} />
        </section>
      </div>
    </AppShell>
  )
}

export const Route = createFileRoute("/_app/admin")({ validateSearch, component: AdminRoute })
