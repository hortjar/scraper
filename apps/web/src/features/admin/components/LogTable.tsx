import { useTranslation } from "react-i18next"

import { DataTable, type DataTableColumn } from "../../../components/organisms"
import type { LogRecord } from "../types"

import { LogLevelBadge } from "./LogLevelBadge"

const ANNOTATION_LIMIT = 4

const summarize = (annotations: LogRecord["annotations"]): string =>
  Object.entries(annotations)
    .slice(0, ANNOTATION_LIMIT)
    .map(([key, value]) => `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join("  ")

export interface LogTableProperties {
  readonly records: readonly LogRecord[]
  readonly className?: string | undefined
}

export const LogTable = ({ records, className }: LogTableProperties) => {
  const { t } = useTranslation("admin")

  const columns: readonly DataTableColumn<LogRecord>[] = [
    {
      id: "at",
      header: t("logs.columns.at"),
      cell: (record) => (
        <span className="font-mono text-mono-micro text-ink-subtle">{record.at.slice(11, 23)}</span>
      ),
    },
    {
      id: "level",
      header: t("logs.columns.level"),
      cell: (record) => <LogLevelBadge level={record.level} />,
    },
    {
      id: "service",
      header: t("logs.columns.service"),
      cell: (record) => <span className="font-mono text-mono-data">{record.service}</span>,
    },
    {
      id: "message",
      header: t("logs.columns.message"),
      cell: (record) => <span className="font-mono text-mono-data text-ink">{record.message}</span>,
    },
    {
      id: "annotations",
      header: t("logs.columns.annotations"),
      cell: (record) => (
        <span className="font-mono text-mono-micro break-all text-ink-subtle">
          {summarize(record.annotations)}
        </span>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={records}
      getRowId={(record) => `${record.at}-${record.message}`}
      caption={t("logs.caption")}
      density="compact"
      className={className}
    />
  )
}
