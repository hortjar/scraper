import { useState } from "react"

import { useInterval } from "../../lib/browser"
import { useFormat } from "../../lib/format"
import { cn } from "../../lib/utils"

const DEFAULT_REFRESH_MS = 30_000

export interface RelativeTimeProperties {
  readonly value: string
  readonly live?: boolean
  readonly refreshMs?: number
  readonly className?: string
}

export const RelativeTime = ({
  value,
  live,
  refreshMs = DEFAULT_REFRESH_MS,
  className,
}: RelativeTimeProperties) => {
  const format = useFormat()
  const [revision, setRevision] = useState(0)

  useInterval(
    () => {
      setRevision((current) => current + 1)
    },
    live === true ? refreshMs : null,
  )

  return (
    <time
      dateTime={value}
      title={format.dateTime(value)}
      data-revision={revision}
      className={cn("text-mono-data text-ink-muted tabular-nums", className)}
    >
      {format.relative(value)}
    </time>
  )
}
