import type { ComponentProps } from "react"

import { cn } from "../../lib/utils"

export const Skeleton = ({ className, ...properties }: ComponentProps<"div">) => (
  <div
    data-slot="skeleton"
    aria-hidden="true"
    className={cn("animate-pulse rounded-md bg-sunken", className)}
    {...properties}
  />
)
