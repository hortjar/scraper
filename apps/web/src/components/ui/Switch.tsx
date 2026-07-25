import * as SwitchPrimitive from "@radix-ui/react-switch"
import type { ComponentProps } from "react"

import { cn } from "../../lib/utils"

export type SwitchProps = ComponentProps<typeof SwitchPrimitive.Root>

export const Switch = ({ className, ...props }: SwitchProps) => (
  <SwitchPrimitive.Root
    data-slot="switch"
    className={cn(
      "inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-line",
      "transition-colors outline-none",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
      "data-[state=checked]:border-brand data-[state=checked]:bg-brand",
      "data-[state=unchecked]:bg-sunken",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block size-4 rounded-full bg-surface shadow-sm",
        "transition-transform data-[state=checked]:translate-x-4",
        "data-[state=unchecked]:translate-x-0.5",
      )}
    />
  </SwitchPrimitive.Root>
)
