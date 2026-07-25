import * as LabelPrimitive from "@radix-ui/react-label"
import type { ComponentProps } from "react"

import { cn } from "../../lib/utils"

export type LabelProps = ComponentProps<typeof LabelPrimitive.Root>

export const Label = ({ className, ...props }: LabelProps) => (
  <LabelPrimitive.Root
    data-slot="label"
    className={cn(
      "text-small font-medium text-ink select-none",
      "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
      className,
    )}
    {...props}
  />
)
