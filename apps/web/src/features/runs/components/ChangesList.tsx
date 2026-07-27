import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Label, Switch } from "../../../components/ui"
import { cn } from "../../../lib/utils"
import type { ChangeSummary } from "../types"

import { ChangeCard } from "./ChangeCard"

export interface ChangesListProperties {
  readonly changes: readonly ChangeSummary[]
  readonly className?: string
}

export const ChangesList = ({ changes, className }: ChangesListProperties) => {
  const { t } = useTranslation("runs")
  const [changedOnly, setChangedOnly] = useState(false)

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center justify-end gap-2">
        <Label htmlFor="changes-changed-only">{t("diff.changedOnly")}</Label>
        <Switch id="changes-changed-only" checked={changedOnly} onCheckedChange={setChangedOnly} />
      </div>
      <div className="flex flex-col gap-4">
        {changes.map((change) => (
          <ChangeCard key={change.id} change={change} changedOnly={changedOnly} />
        ))}
      </div>
    </div>
  )
}
