import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { RelativeTime } from "../../../components/molecules/RelativeTime"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui"
import { useFormat } from "../../../lib/format"
import { cn } from "../../../lib/utils"
import { EMPTY_VALUE_MARK } from "../constants"
import { RUN_TRIGGER_KEY } from "../format"
import type { RunSummary } from "../types"

import { RunErrorSummary } from "./RunErrorSummary"
import { RunStatusBadge } from "./RunStatusBadge"

export interface RunSummaryCardProperties {
  readonly run: RunSummary
  readonly className?: string
}

const Field = ({ label, children }: { readonly label: string; readonly children: ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <dt className="eyebrow text-ink-subtle">{label}</dt>
    <dd className="font-mono text-mono-data text-ink tabular-nums">{children}</dd>
  </div>
)

export const RunSummaryCard = ({ run, className }: RunSummaryCardProperties) => {
  const { t } = useTranslation("runs")
  const format = useFormat()

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{t("detail.summaryTitle")}</CardTitle>
          <RunStatusBadge status={run.status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label={t("columns.trigger")}>{t(RUN_TRIGGER_KEY[run.trigger])}</Field>
          <Field label={t("columns.strategy")}>{run.strategyUsed ?? EMPTY_VALUE_MARK}</Field>
          <Field label={t("columns.attempt")}>{format.number(run.attempt)}</Field>
          <Field label={t("columns.startedAt")}>
            <RelativeTime value={run.startedAt} />
          </Field>
          <Field label={t("detail.finishedAt")}>
            {run.finishedAt === null ? EMPTY_VALUE_MARK : <RelativeTime value={run.finishedAt} />}
          </Field>
          <Field label={t("columns.duration")}>
            {run.durationMs === null ? EMPTY_VALUE_MARK : format.duration(run.durationMs)}
          </Field>
          <Field label={t("columns.httpStatus")}>
            {run.httpStatus === null ? EMPTY_VALUE_MARK : format.number(run.httpStatus)}
          </Field>
          <Field label={t("columns.size")}>
            {run.bytes === null ? EMPTY_VALUE_MARK : format.bytes(run.bytes)}
          </Field>
          <Field label={t("columns.changed")}>
            {t(run.changed ? "changedState.yes" : "changedState.no")}
          </Field>
        </dl>
        <RunErrorSummary errorKind={run.errorKind} errorMessage={run.errorMessage} />
      </CardContent>
    </Card>
  )
}
