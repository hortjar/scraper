import { useTranslation } from "react-i18next"

import { Button } from "../../../components/ui/Button"

export interface MonitorsPaginationProperties {
  readonly count: number
  readonly hasPrevious: boolean
  readonly nextCursor: string | undefined
  readonly onStartOver: () => void
  readonly onNext: (cursor: string) => void
}

export const MonitorsPagination = ({
  count,
  hasPrevious,
  nextCursor,
  onStartOver,
  onNext,
}: MonitorsPaginationProperties) => {
  const { t } = useTranslation("monitors")

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-small text-ink-muted">{t("list.count", { count })}</p>
      <div className="flex items-center gap-2">
        {hasPrevious ? (
          <Button variant="ghost" size="sm" onClick={onStartOver}>
            {t("list.startOver")}
          </Button>
        ) : null}
        {nextCursor === undefined ? null : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              onNext(nextCursor)
            }}
          >
            {t("list.loadMore")}
          </Button>
        )}
      </div>
    </div>
  )
}
