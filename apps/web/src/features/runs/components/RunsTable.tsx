import { CheckIcon, MinusIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { RelativeTime } from "../../../components/molecules/RelativeTime"
import { type DataTableColumn, DataTable } from "../../../components/organisms"
import { Badge } from "../../../components/ui"
import { useFormat } from "../../../lib/format"
import { cn } from "../../../lib/utils"
import type { Density } from "../../../stores/ui"
import { EMPTY_VALUE_MARK, RUN_STATUS } from "../constants"
import { RUN_TRIGGER_KEY } from "../format"
import type { RunSummary } from "../types"

import { RunErrorSummary } from "./RunErrorSummary"
import { RunStatusBadge } from "./RunStatusBadge"

export interface RunsTableProperties {
  readonly runs: readonly RunSummary[]
  readonly density?: Density
  readonly onSelectRun?: (run: RunSummary) => void
  readonly className?: string
}

const monoOrEmpty = (value: string | null): string => value ?? EMPTY_VALUE_MARK

export const RunsTable = ({ runs, density, onSelectRun, className }: RunsTableProperties) => {
  const { t } = useTranslation("runs")
  const format = useFormat()

  const columns: readonly DataTableColumn<RunSummary>[] = [
    {
      id: "status",
      header: t("columns.status"),
      cell: (run) => <RunStatusBadge status={run.status} />,
    },
    {
      id: "startedAt",
      header: t("columns.startedAt"),
      cell: (run) => <RelativeTime value={run.startedAt} />,
    },
    { id: "trigger", header: t("columns.trigger"), cell: (run) => t(RUN_TRIGGER_KEY[run.trigger]) },
    {
      id: "strategy",
      header: t("columns.strategy"),
      numeric: true,
      cell: (run) => monoOrEmpty(run.strategyUsed),
    },
    {
      id: "httpStatus",
      header: t("columns.httpStatus"),
      numeric: true,
      align: "end",
      cell: (run) => (run.httpStatus === null ? EMPTY_VALUE_MARK : format.number(run.httpStatus)),
    },
    {
      id: "duration",
      header: t("columns.duration"),
      numeric: true,
      align: "end",
      cell: (run) => (run.durationMs === null ? EMPTY_VALUE_MARK : format.duration(run.durationMs)),
    },
    {
      id: "bytes",
      header: t("columns.size"),
      numeric: true,
      align: "end",
      cell: (run) => (run.bytes === null ? EMPTY_VALUE_MARK : format.bytes(run.bytes)),
    },
    {
      id: "changed",
      header: t("columns.changed"),
      cell: (run) => (
        <Badge tone={run.changed ? "brand" : "neutral"} className="gap-1">
          {run.changed ? (
            <CheckIcon className="size-3" aria-hidden="true" />
          ) : (
            <MinusIcon className="size-3" aria-hidden="true" />
          )}
          {t(run.changed ? "changedState.yes" : "changedState.no")}
        </Badge>
      ),
    },
    {
      id: "error",
      header: t("columns.error"),
      cell: (run) =>
        run.status === RUN_STATUS.failed ? (
          <RunErrorSummary
            errorKind={run.errorKind}
            errorMessage={run.errorMessage}
            className="max-w-72"
          />
        ) : (
          <span className="text-ink-subtle">{EMPTY_VALUE_MARK}</span>
        ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={runs}
      getRowId={(run) => run.id}
      caption={t("title")}
      density={density}
      onRowClick={onSelectRun}
      className={cn(className)}
    />
  )
}
