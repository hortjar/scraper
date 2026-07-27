import type { DiffHunk } from "@scraper/core/domain"
import { diffWords } from "diff"

import {
  DIFF_CONTEXT_LINES,
  LINE_SEPARATOR,
  MAX_DIFF_HUNKS,
  MAX_HUNK_CHARACTERS,
} from "../runs.constants.js"

const HUNK_KIND = { added: "added", removed: "removed", unchanged: "unchanged" } as const

interface Part {
  readonly value: string
  readonly added?: boolean | undefined
  readonly removed?: boolean | undefined
}

const kindOf = (part: Part): DiffHunk["kind"] => {
  if (part.added === true) return HUNK_KIND.added
  if (part.removed === true) return HUNK_KIND.removed
  return HUNK_KIND.unchanged
}

const headLines = (value: string, count: number): string =>
  value.split(LINE_SEPARATOR).slice(0, count).join(LINE_SEPARATOR)

const tailLines = (value: string, count: number): string =>
  value.split(LINE_SEPARATOR).slice(-count).join(LINE_SEPARATOR)

const lineCount = (value: string): number => value.split(LINE_SEPARATOR).length

const contextFor = (value: string, hasBefore: boolean, hasAfter: boolean): string => {
  if (!hasBefore && !hasAfter) return ""
  if (lineCount(value) <= DIFF_CONTEXT_LINES * 2) return value
  if (!hasBefore) return tailLines(value, DIFF_CONTEXT_LINES)
  if (!hasAfter) return headLines(value, DIFF_CONTEXT_LINES)
  return [tailLines(value, DIFF_CONTEXT_LINES), headLines(value, DIFF_CONTEXT_LINES)].join(
    LINE_SEPARATOR,
  )
}

const truncate = (value: string): string =>
  value.length <= MAX_HUNK_CHARACTERS ? value : value.slice(0, MAX_HUNK_CHARACTERS)

export const withContext = (parts: readonly Part[]): readonly DiffHunk[] => {
  const changedIndexes = parts.map((part, index) => (kindOf(part) === "unchanged" ? -1 : index))
  const firstChange = changedIndexes.find((index) => index >= 0)
  if (firstChange === undefined) return []
  let lastChange = -1

  for (const index of changedIndexes) {
    lastChange = index >= 0 ? index : lastChange
  }

  const hunks: DiffHunk[] = []
  for (const [index, part] of parts.entries()) {
    const kind = kindOf(part)
    if (kind !== "unchanged") {
      hunks.push({ kind, value: truncate(part.value) })
      continue
    }
    const value = contextFor(part.value, index > firstChange, index < lastChange)
    if (value !== "") hunks.push({ kind, value: truncate(value) })
  }
  return hunks.slice(0, MAX_DIFF_HUNKS)
}

export const diffText = (previous: string, current: string): readonly DiffHunk[] =>
  withContext(diffWords(previous, current))
