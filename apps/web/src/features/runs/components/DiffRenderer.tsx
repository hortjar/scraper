import { useTranslation } from "react-i18next"

import { cn } from "../../../lib/utils"
import { DIFF_HUNK_KIND } from "../constants"
import type { DiffHunk } from "../types"

const HUNK_TONE = {
  [DIFF_HUNK_KIND.added]: "bg-positive-soft text-positive-ink",
  [DIFF_HUNK_KIND.removed]: "bg-negative-soft text-negative-ink line-through decoration-1",
  [DIFF_HUNK_KIND.unchanged]: "text-ink-subtle",
} as const

const HUNK_MARKER = {
  [DIFF_HUNK_KIND.added]: "+",
  [DIFF_HUNK_KIND.removed]: "−",
  [DIFF_HUNK_KIND.unchanged]: " ",
} as const

const HUNK_LABEL_KEY = {
  [DIFF_HUNK_KIND.added]: "diff.added",
  [DIFF_HUNK_KIND.removed]: "diff.removed",
  [DIFF_HUNK_KIND.unchanged]: "diff.unchanged",
} as const satisfies Record<DiffHunk["kind"], string>

export interface DiffRendererProperties {
  readonly hunks: readonly DiffHunk[]
  readonly changedOnly?: boolean | undefined
  readonly className?: string | undefined
}

export const DiffRenderer = ({ hunks, changedOnly = false, className }: DiffRendererProperties) => {
  const { t } = useTranslation("runs")
  const visible = changedOnly
    ? hunks.filter((hunk) => hunk.kind !== DIFF_HUNK_KIND.unchanged)
    : hunks

  if (visible.length === 0) {
    return <p className={cn("text-small text-ink-subtle", className)}>{t("diff.empty")}</p>
  }

  return (
    <div
      role="group"
      aria-label={t("diff.title")}
      className={cn(
        "flex flex-col gap-0.5 overflow-x-auto rounded-lg border border-line bg-surface p-2",
        className,
      )}
    >
      {visible.map((hunk, index) => (
        <div
          key={`${hunk.kind}-${String(index)}`}
          className={cn(
            "rounded px-2 py-1 font-mono text-mono-data whitespace-pre-wrap",
            HUNK_TONE[hunk.kind],
          )}
        >
          <span aria-hidden="true" className="mr-1.5 select-none">
            {HUNK_MARKER[hunk.kind]}
          </span>
          <span className="sr-only">{t(HUNK_LABEL_KEY[hunk.kind])} </span>
          {hunk.value}
        </div>
      ))}
    </div>
  )
}
