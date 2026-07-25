import type { ReactNode } from "react"

import { cn } from "../../lib/utils"

export interface MetricTileProperties {
  readonly label: string
  readonly value: string
  readonly hint?: string
  readonly trailing?: ReactNode
  readonly className?: string
}

export const MetricTile = ({ label, value, hint, trailing, className }: MetricTileProperties) => (
  <div className={cn("rounded-lg border border-line bg-surface px-4 py-3", className)}>
    <p className="eyebrow text-ink-subtle">{label}</p>
    <div className="mt-1.5 flex items-baseline gap-2">
      <p className="font-mono text-title tabular-nums text-ink" data-numeric>
        {value}
      </p>
      {trailing}
    </div>
    {hint === undefined ? null : <p className="mt-1 text-small text-ink-muted">{hint}</p>}
  </div>
)
