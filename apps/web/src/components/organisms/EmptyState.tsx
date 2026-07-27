import type { ReactNode } from "react"

import { cn } from "../../lib/utils"

import { PulseStrip } from "./PulseStrip"

export interface EmptyStateProperties {
  readonly title: string
  readonly description?: string
  readonly action?: ReactNode
  readonly className?: string | undefined
}

export const EmptyState = ({ title, description, action, className }: EmptyStateProperties) => (
  <div
    className={cn(
      "flex flex-col items-center gap-4 rounded-lg border border-dashed border-line",
      "bg-surface px-6 py-12 text-center",
      className,
    )}
  >
    <PulseStrip ticks={[]} size="hero" className="max-w-80" />
    <div className="flex flex-col gap-1">
      <h3 className="text-heading text-ink">{title}</h3>
      {description === undefined ? null : (
        <p className="max-w-prose text-body text-ink-muted">{description}</p>
      )}
    </div>
    {action}
  </div>
)
