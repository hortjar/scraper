import { useTranslation } from "react-i18next"

import { DELTA_KIND, DeltaBadge, RelativeTime } from "../../../components/molecules"
import { Badge, Card, CardContent, CardHeader } from "../../../components/ui"
import { useFormat } from "../../../lib/format"
import { cn } from "../../../lib/utils"
import { EMPTY_VALUE_MARK } from "../constants"
import { CHANGE_KIND_KEY, CHANGE_KIND_TONE, isNumericChangeKind, percentToRatio } from "../format"
import type { ChangeSummary } from "../types"

import { DiffRenderer } from "./DiffRenderer"

export interface ChangeCardProperties {
  readonly change: ChangeSummary
  readonly changedOnly?: boolean
  readonly className?: string
}

export const ChangeCard = ({ change, changedOnly, className }: ChangeCardProperties) => {
  const { t } = useTranslation("runs")
  const format = useFormat()
  const isNumeric = isNumericChangeKind(change.changeKind)
  const oldNumberLabel =
    change.oldNumber === null ? EMPTY_VALUE_MARK : format.number(change.oldNumber)
  const newNumberLabel =
    change.newNumber === null ? EMPTY_VALUE_MARK : format.number(change.newNumber)

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-mono-data text-ink">
            {change.extractorKey ?? t("diff.wholePage")}
          </span>
          <Badge tone={CHANGE_KIND_TONE[change.changeKind]}>
            {t(CHANGE_KIND_KEY[change.changeKind])}
          </Badge>
        </div>
        <RelativeTime value={change.createdAt} />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isNumeric ? (
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-mono text-mono-data text-ink-muted">
              {oldNumberLabel} → {newNumberLabel}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="eyebrow text-ink-subtle">{t("changes.delta.absoluteLabel")}</span>
              {change.deltaAbsolute === null ? (
                EMPTY_VALUE_MARK
              ) : (
                <DeltaBadge value={change.deltaAbsolute} kind={DELTA_KIND.absolute} />
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="eyebrow text-ink-subtle">{t("changes.delta.percentLabel")}</span>
              {change.deltaPercent === null ? (
                EMPTY_VALUE_MARK
              ) : (
                <DeltaBadge value={percentToRatio(change.deltaPercent)} kind={DELTA_KIND.percent} />
              )}
            </div>
          </div>
        ) : (
          <p className="font-mono text-mono-data text-ink-muted">
            {change.oldValue ?? EMPTY_VALUE_MARK} → {change.newValue ?? EMPTY_VALUE_MARK}
          </p>
        )}
        {change.diff === null ? null : (
          <DiffRenderer hunks={change.diff} changedOnly={changedOnly} />
        )}
      </CardContent>
    </Card>
  )
}
