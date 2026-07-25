import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "../../lib/utils"
import { Button } from "../ui/Button"

export interface CopyableCodeProperties {
  readonly value: string
  readonly truncate?: boolean
  readonly className?: string
}

export const CopyableCode = ({ value, truncate, className }: CopyableCodeProperties) => {
  const { t } = useTranslation("common")
  const [copied, setCopied] = useState(false)

  const copy = () => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
    })
  }

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-sm bg-sunken px-1.5 py-0.5",
        className,
      )}
      onMouseLeave={() => {
        setCopied(false)
      }}
    >
      <code className={cn("text-mono-data text-ink", truncate === true && "truncate")}>
        {value}
      </code>
      <Button
        variant="ghost"
        size="sm"
        className="size-6 min-h-0 shrink-0 p-0"
        aria-label={t(copied ? "actions.copied" : "actions.copy")}
        onClick={copy}
        onBlur={() => {
          setCopied(false)
        }}
      >
        {copied ? (
          <CheckIcon className="size-3.5 text-positive" aria-hidden="true" />
        ) : (
          <CopyIcon className="size-3.5" aria-hidden="true" />
        )}
      </Button>
    </span>
  )
}
