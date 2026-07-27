import { TriangleAlertIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "../../../lib/utils"

export interface RunErrorSummaryProperties {
  readonly errorKind: string | null
  readonly errorMessage: string | null
  readonly className?: string
}

export const RunErrorSummary = ({
  errorKind,
  errorMessage,
  className,
}: RunErrorSummaryProperties) => {
  const { t } = useTranslation("runs")

  if (errorKind === null && errorMessage === null) return null

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-1 rounded-md border border-negative/30 bg-negative-soft px-3 py-2",
        className,
      )}
    >
      <p className="flex items-center gap-1.5 text-small font-medium text-negative-ink">
        <TriangleAlertIcon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="font-mono text-mono-data">{errorKind ?? t("error.unknownKind")}</span>
      </p>
      {errorMessage === null ? null : (
        <p className="line-clamp-3 font-mono text-mono-data break-words text-negative-ink/90">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
