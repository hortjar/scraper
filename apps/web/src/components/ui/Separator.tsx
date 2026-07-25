import * as SeparatorPrimitive from "@radix-ui/react-separator"
import type { ComponentProps } from "react"

import { cn } from "../../lib/utils"

export type SeparatorProperties = ComponentProps<typeof SeparatorPrimitive.Root>

export const Separator = ({
  className,
  orientation = "horizontal",
  decorative = true,
  ...properties
}: SeparatorProperties) => (
  <SeparatorPrimitive.Root
    data-slot="separator"
    orientation={orientation}
    decorative={decorative}
    className={cn(
      "shrink-0 bg-line",
      orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
      className,
    )}
    {...properties}
  />
)
