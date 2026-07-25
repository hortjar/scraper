import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { useFormat } from "../../lib/format"
import { cn } from "../../lib/utils"

export const DELTA_KIND = { absolute: "absolute", percent: "percent" } as const
export type DeltaKind = (typeof DELTA_KIND)[keyof typeof DELTA_KIND]

const DIRECTION_ICON = { up: ArrowUpIcon, down: ArrowDownIcon, flat: MinusIcon } as const

const DIRECTION_CLASS = {
  up: "text-positive-ink",
  down: "text-negative-ink",
  flat: "text-ink-subtle",
} as const

const DIRECTION_KEY = {
  up: "delta.increase",
  down: "delta.decrease",
  flat: "delta.unchanged",
} as const

export interface DeltaBadgeProps {
  readonly value: number
  readonly kind?: DeltaKind
  readonly className?: string
}

export const DeltaBadge = ({ value, kind = DELTA_KIND.absolute, className }: DeltaBadgeProps) => {
  const { t } = useTranslation("common")
  const format = useFormat()

  const direction = value > 0 ? "up" : value < 0 ? "down" : "flat"
  const Icon = DIRECTION_ICON[direction]
  const rendered =
    kind === DELTA_KIND.percent
      ? format.percent(value, 1)
      : format.number(value, { signDisplay: "exceptZero" })

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-mono-data tabular-nums",
        DIRECTION_CLASS[direction],
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="sr-only">{t(DIRECTION_KEY[direction])}</span>
      <span data-numeric>{rendered}</span>
    </span>
  )
}
