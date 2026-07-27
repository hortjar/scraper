import { useTranslation } from "react-i18next"

import { CopyableCode } from "../../../components/molecules/CopyableCode"
import { RelativeTime } from "../../../components/molecules/RelativeTime"
import { StatusPill } from "../../../components/molecules/StatusPill"
import { Badge } from "../../../components/ui/Badge"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/Card"
import { SCHEDULE_KIND, toMonitorStatus } from "../constants"
import { ENGINE_LABEL } from "../label-keys"
import { asText } from "../nullable"
import type { MonitorDetail } from "../types"

export interface MonitorOverviewProperties {
  readonly monitor: MonitorDetail
}

export const MonitorOverview = ({ monitor }: MonitorOverviewProperties) => {
  const { t } = useTranslation("monitors")

  const lastRunAt = asText(monitor.lastRunAt)
  const nextRunAt = asText(monitor.nextRunAt)
  const lastChangeAt = asText(monitor.lastChangeAt)
  const contentSelector = asText(monitor.contentSelector)

  const rows: readonly (readonly [string, React.ReactNode])[] = [
    [t("detail.statusLabel"), <StatusPill key="status" status={toMonitorStatus(monitor.status)} />],
    [t("detail.urlLabel"), <CopyableCode key="url" value={monitor.url} truncate />],
    [t("detail.engineLabel"), t(ENGINE_LABEL[monitor.engine])],
    [
      t("detail.scheduleLabel"),
      monitor.schedule.kind === SCHEDULE_KIND.cron
        ? t("schedule.summaryCron", { expression: monitor.schedule.expression })
        : t("schedule.summaryInterval", { seconds: monitor.schedule.intervalSeconds }),
    ],
    [
      t("detail.contentSelectorLabel"),
      contentSelector === undefined ? t("detail.no") : <CopyableCode value={contentSelector} />,
    ],
    [t("detail.respectRobotsLabel"), t(monitor.respectRobots ? "detail.yes" : "detail.no")],
    [t("detail.failuresLabel"), String(monitor.consecutiveFailures)],
    [
      t("detail.lastRunLabel"),
      lastRunAt === undefined ? t("detail.never") : <RelativeTime value={lastRunAt} />,
    ],
    [
      t("detail.nextRunLabel"),
      nextRunAt === undefined ? t("detail.never") : <RelativeTime value={nextRunAt} />,
    ],
    [
      t("detail.lastChangeLabel"),
      lastChangeAt === undefined ? t("detail.never") : <RelativeTime value={lastChangeAt} />,
    ],
    [t("detail.createdLabel"), <RelativeTime key="created" value={monitor.createdAt} />],
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("detail.overviewTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col gap-0.5">
              <dt className="eyebrow text-ink-subtle">{label}</dt>
              <dd className="min-w-0 truncate text-body text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap items-center gap-1 border-t border-line pt-3">
          {monitor.tags.length === 0 ? (
            <span className="text-small text-ink-subtle">{t("detail.tagsEmpty")}</span>
          ) : (
            monitor.tags.map((tag) => (
              <Badge key={tag} tone="outline">
                {tag}
              </Badge>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
