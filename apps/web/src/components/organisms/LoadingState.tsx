import { useTranslation } from "react-i18next"

import { cn } from "../../lib/utils"
import { Skeleton } from "../ui/Skeleton"

const DEFAULT_ROWS = 5

export interface LoadingStateProperties {
  readonly rows?: number
  readonly className?: string
}

export const LoadingState = ({ rows = DEFAULT_ROWS, className }: LoadingStateProperties) => {
  const { t } = useTranslation("common")

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t("state.loading")}
      className={cn("flex flex-col gap-2", className)}
    >
      {Array.from({ length: rows }, (_unused, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-md border border-line bg-surface px-4 py-3"
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}
