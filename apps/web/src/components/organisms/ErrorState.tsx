import { TriangleAlertIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { useErrorMessage } from "../../lib/api"
import { cn } from "../../lib/utils"
import { Button } from "../ui/Button"

export interface ErrorStateProperties {
  readonly error: unknown
  readonly title?: string
  readonly onRetry?: () => void
  readonly className?: string
}

export const ErrorState = ({ error, title, onRetry, className }: ErrorStateProperties) => {
  const { t } = useTranslation("common")
  const describe = useErrorMessage()

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-3 rounded-lg border border-line bg-surface px-5 py-4",
        className,
      )}
    >
      <p className="flex items-center gap-2 text-body font-medium text-ink">
        <TriangleAlertIcon className="size-4 text-negative" aria-hidden="true" />
        {title ?? t("state.errorTitle")}
      </p>
      <p className="text-small text-ink-muted">{describe(error)}</p>
      {onRetry === undefined ? null : (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t("actions.retry")}
        </Button>
      )}
    </div>
  )
}
