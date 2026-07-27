import { CheckIcon, XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { type DataTableColumn, DataTable, EmptyState } from "../../../components/organisms"
import { useFormat } from "../../../lib/format"
import { cn } from "../../../lib/utils"
import { useDensity } from "../../../stores/ui"
import type { RunFieldValue } from "../types"

export interface RunFieldValuesTableProperties {
  readonly fields: readonly RunFieldValue[]
  readonly className?: string
}

const FieldValueCell = ({ field }: { readonly field: RunFieldValue }) => {
  const { t } = useTranslation("runs")
  const format = useFormat()

  if (field.valueList !== null) {
    return <span className="font-mono text-mono-data">{field.valueList.join(", ")}</span>
  }
  if (field.valueNumber !== null) {
    return (
      <span className="font-mono text-mono-data tabular-nums">
        {format.number(field.valueNumber)}
      </span>
    )
  }
  if (field.valueBool !== null) {
    return (
      <span className="font-mono text-mono-data">
        {t(field.valueBool ? "fields.true" : "fields.false")}
      </span>
    )
  }
  if (field.valueText !== null) {
    return <span className="font-mono text-mono-data">{field.valueText}</span>
  }
  return <span className="text-ink-subtle">{t("fields.empty")}</span>
}

const MissingCell = ({ missing }: { readonly missing: boolean }) => {
  const { t } = useTranslation("runs")
  return missing ? (
    <span className="inline-flex items-center gap-1 text-negative-ink">
      <XIcon className="size-3.5" aria-hidden="true" />
      {t("fields.missing")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-ink-subtle">
      <CheckIcon className="size-3.5" aria-hidden="true" />
      {t("fields.present")}
    </span>
  )
}

export const RunFieldValuesTable = ({ fields, className }: RunFieldValuesTableProperties) => {
  const { t } = useTranslation("runs")
  const density = useDensity()

  if (fields.length === 0) {
    return (
      <EmptyState
        title={t("fields.emptyTitle")}
        description={t("fields.emptyDescription")}
        className={className}
      />
    )
  }

  const columns: readonly DataTableColumn<RunFieldValue>[] = [
    {
      id: "extractorKey",
      header: t("fields.extractorKey"),
      cell: (field) => <span className="font-mono text-mono-data">{field.extractorKey}</span>,
    },
    { id: "value", header: t("fields.value"), cell: (field) => <FieldValueCell field={field} /> },
    {
      id: "missing",
      header: t("fields.missing"),
      align: "end",
      cell: (field) => <MissingCell missing={field.missing} />,
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={fields}
      getRowId={(field) => field.extractorKey}
      caption={t("fields.title")}
      density={density}
      className={cn(className)}
    />
  )
}
