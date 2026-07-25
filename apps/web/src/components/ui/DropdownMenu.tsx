import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import type { ComponentProps } from "react"

import { cn } from "../../lib/utils"

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuGroup = DropdownMenuPrimitive.Group
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

export const DropdownMenuContent = ({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      data-slot="dropdown-menu-content"
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-44 overflow-hidden rounded-md border border-line bg-raised p-1",
        "shadow-popover data-[state=open]:animate-pop-in",
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
)

const itemClass = [
  "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5",
  "text-small text-ink outline-none select-none",
  "data-[highlighted]:bg-sunken data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
].join(" ")

export const DropdownMenuItem = ({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item>) => (
  <DropdownMenuPrimitive.Item
    data-slot="dropdown-menu-item"
    className={cn(itemClass, className)}
    {...props}
  />
)

export const DropdownMenuRadioItem = ({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) => (
  <DropdownMenuPrimitive.RadioItem
    data-slot="dropdown-menu-radio-item"
    className={cn(itemClass, "pl-7", className)}
    {...props}
  >
    <span className="absolute left-2 flex size-3 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <span className="size-1.5 rounded-full bg-brand" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
)

export const DropdownMenuLabel = ({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Label>) => (
  <DropdownMenuPrimitive.Label
    data-slot="dropdown-menu-label"
    className={cn("px-2 py-1.5 eyebrow text-ink-subtle", className)}
    {...props}
  />
)

export const DropdownMenuSeparator = ({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Separator>) => (
  <DropdownMenuPrimitive.Separator
    data-slot="dropdown-menu-separator"
    className={cn("-mx-1 my-1 h-px bg-line", className)}
    {...props}
  />
)
