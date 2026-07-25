import type { ComponentProps } from "react"

import { cn } from "../../lib/utils"

export const Card = ({ className, ...properties }: ComponentProps<"div">) => (
  <div
    data-slot="card"
    className={cn("rounded-lg border border-line bg-surface", className)}
    {...properties}
  />
)

export const CardHeader = ({ className, ...properties }: ComponentProps<"div">) => (
  <div
    data-slot="card-header"
    className={cn("flex flex-col gap-1 border-b border-line px-5 py-4", className)}
    {...properties}
  />
)

export const CardTitle = ({ className, ...properties }: ComponentProps<"h3">) => (
  <h3 data-slot="card-title" className={cn("text-heading text-ink", className)} {...properties} />
)

export const CardDescription = ({ className, ...properties }: ComponentProps<"p">) => (
  <p
    data-slot="card-description"
    className={cn("text-small text-ink-muted", className)}
    {...properties}
  />
)

export const CardContent = ({ className, ...properties }: ComponentProps<"div">) => (
  <div data-slot="card-content" className={cn("px-5 py-4", className)} {...properties} />
)

export const CardFooter = ({ className, ...properties }: ComponentProps<"div">) => (
  <div
    data-slot="card-footer"
    className={cn("flex items-center gap-2 border-t border-line px-5 py-3", className)}
    {...properties}
  />
)
