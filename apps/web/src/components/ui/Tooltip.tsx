import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import type { ComponentProps } from "react"

import { cn } from "../../lib/utils"

export const TooltipProvider = ({
  delayDuration = 200,
  ...properties
}: ComponentProps<typeof TooltipPrimitive.Provider>) => (
  <TooltipPrimitive.Provider delayDuration={delayDuration} {...properties} />
)

export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

export const TooltipContent = ({
  className,
  sideOffset = 6,
  children,
  ...properties
}: ComponentProps<typeof TooltipPrimitive.Content>) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      data-slot="tooltip-content"
      sideOffset={sideOffset}
      className={cn(
        "z-50 max-w-64 rounded-md border border-line bg-raised px-2.5 py-1.5",
        "text-small text-ink shadow-popover data-[state=delayed-open]:animate-fade-in",
        className,
      )}
      {...properties}
    >
      {children}
      <TooltipPrimitive.Arrow className="fill-[var(--surface-raised)]" />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
)
