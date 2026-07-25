import { Slot } from "@radix-ui/react-slot"
import { type VariantProps, cva } from "class-variance-authority"
import type { ComponentProps } from "react"

import { cn } from "../../lib/utils"

export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md",
    "font-medium transition-colors outline-none select-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    "disabled:pointer-events-none disabled:opacity-50",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-contrast hover:bg-brand-hover",
        secondary: "border border-line bg-surface text-ink hover:bg-sunken",
        ghost: "text-ink-muted hover:bg-sunken hover:text-ink",
        danger: "bg-negative text-brand-contrast hover:opacity-90",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        sm: "min-h-8 px-2.5 py-1 text-small",
        md: "min-h-9 px-3.5 py-1.5 text-body",
        lg: "min-h-11 px-5 py-2 text-body",
        icon: "size-9 p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
)

export interface ButtonProperties
  extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  readonly asChild?: boolean
}

export const Button = ({ className, variant, size, asChild, ...properties }: ButtonProperties) => {
  const Component = asChild === true ? Slot : "button"
  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...properties}
    />
  )
}
