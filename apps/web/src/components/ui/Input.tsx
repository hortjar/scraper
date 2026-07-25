import type { ComponentProps } from "react"

import { cn } from "../../lib/utils"

export type InputProperties = ComponentProps<"input">

export const Input = ({ className, type = "text", ...properties }: InputProperties) => (
  <input
    type={type}
    data-slot="input"
    className={cn(
      "min-h-9 w-full rounded-md border border-line bg-surface px-3 py-1.5 text-body text-ink",
      "placeholder:text-ink-subtle transition-colors outline-none",
      "focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-2",
      "focus-visible:outline-brand",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "aria-invalid:border-negative",
      className,
    )}
    {...properties}
  />
)
