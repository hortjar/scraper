import { type VariantProps, cva } from "class-variance-authority"
import type { ComponentProps } from "react"

import { cn } from "../../lib/utils"

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-mono-micro font-medium uppercase",
  {
    variants: {
      tone: {
        neutral: "bg-sunken text-ink-muted",
        brand: "bg-brand-soft text-brand-ink",
        positive: "bg-positive-soft text-positive-ink",
        negative: "bg-negative-soft text-negative-ink",
        warning: "bg-warning-soft text-warning-ink",
        info: "bg-info-soft text-info-ink",
        outline: "border border-line text-ink-muted",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
)

export interface BadgeProperties
  extends ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, tone, ...properties }: BadgeProperties) => (
  <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...properties} />
)
