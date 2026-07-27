import type { ReactNode } from "react"

import { Label } from "../../../components/ui/Label"
import { cn } from "../../../lib/utils"

export interface FormFieldProperties {
  readonly id: string
  readonly label: string
  readonly hint?: string | undefined
  readonly error?: string | undefined
  readonly className?: string | undefined
  readonly children: ReactNode
}

export const FormField = ({ id, label, hint, error, className, children }: FormFieldProperties) => (
  <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
    <Label htmlFor={id}>{label}</Label>
    {children}
    {error === undefined ? null : (
      <p id={`${id}-error`} className="text-small text-negative-ink">
        {error}
      </p>
    )}
    {error === undefined && hint !== undefined ? (
      <p id={`${id}-hint`} className="text-small text-ink-subtle">
        {hint}
      </p>
    ) : null}
  </div>
)
