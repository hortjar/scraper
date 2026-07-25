import * as ToastPrimitive from "@radix-ui/react-toast"
import { type VariantProps, cva } from "class-variance-authority"
import type { ComponentProps } from "react"

import { cn } from "../../lib/utils"

export const ToastProvider = ToastPrimitive.Provider
export const ToastAction = ToastPrimitive.Action
export const ToastClose = ToastPrimitive.Close

export const toastVariants = cva(
  [
    "pointer-events-auto flex items-start gap-3 rounded-md border bg-raised p-3",
    "shadow-popover data-[state=open]:animate-pop-in",
  ].join(" "),
  {
    variants: {
      tone: {
        neutral: "border-line",
        positive: "border-positive",
        negative: "border-negative",
        warning: "border-warning",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
)

export const ToastViewport = ({
  className,
  ...properties
}: ComponentProps<typeof ToastPrimitive.Viewport>) => (
  <ToastPrimitive.Viewport
    data-slot="toast-viewport"
    className={cn(
      "pointer-events-none fixed right-0 bottom-0 z-100 flex w-[min(24rem,100vw)]",
      "flex-col gap-2 p-4 outline-none",
      className,
    )}
    {...properties}
  />
)

export interface ToastProperties
  extends ComponentProps<typeof ToastPrimitive.Root>, VariantProps<typeof toastVariants> {}

export const Toast = ({ className, tone, ...properties }: ToastProperties) => (
  <ToastPrimitive.Root
    data-slot="toast"
    className={cn(toastVariants({ tone }), className)}
    {...properties}
  />
)

export const ToastTitle = ({
  className,
  ...properties
}: ComponentProps<typeof ToastPrimitive.Title>) => (
  <ToastPrimitive.Title
    data-slot="toast-title"
    className={cn("text-body font-medium text-ink", className)}
    {...properties}
  />
)

export const ToastDescription = ({
  className,
  ...properties
}: ComponentProps<typeof ToastPrimitive.Description>) => (
  <ToastPrimitive.Description
    data-slot="toast-description"
    className={cn("text-small text-ink-muted", className)}
    {...properties}
  />
)
