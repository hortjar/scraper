import { CHANGE_KIND, TRIGGER_KIND } from "@scraper/core/constants"
import type { ExtractorKey, TriggerConfig } from "@scraper/core/domain"

import type { ChangeDraft } from "../diff/field-diff.js"

const MILLIS_PER_HOUR = 3_600_000

export interface TriggerContext {
  readonly changes: readonly ChangeDraft[]
  readonly runFailed: boolean
  readonly previousRunFailed: boolean
  readonly lastChangeAt: Date | null
  readonly now: Date
}

const forKey = (
  changes: readonly ChangeDraft[],
  key: ExtractorKey | null,
): readonly ChangeDraft[] =>
  key === null ? changes : changes.filter((change) => change.extractorKey === key)

const fired = (changes: readonly ChangeDraft[]): readonly ChangeDraft[] | null =>
  changes.length > 0 ? changes : null

const compare = (operator: "gt" | "gte" | "lt" | "lte" | "eq", left: number, right: number) => {
  if (operator === "gt") return left > right
  if (operator === "gte") return left >= right
  if (operator === "lt") return left < right
  if (operator === "lte") return left <= right
  return left === right
}

const isPercentMatch = (
  direction: "up" | "down" | "any",
  percent: number,
  change: ChangeDraft,
): boolean => {
  const actual = change.deltaPercent
  if (actual === null) return false
  if (direction === "up") return actual >= percent
  if (direction === "down") return actual <= -percent
  return Math.abs(actual) >= percent
}

const textOf = (change: ChangeDraft): string => change.newValue ?? ""

const hasText = (change: ChangeDraft, needle: string, isCaseSensitive: boolean): boolean =>
  isCaseSensitive
    ? textOf(change).includes(needle)
    : textOf(change).toLowerCase().includes(needle.toLowerCase())

const isAvailabilityMatch = (
  expect: "available" | "unavailable" | "any",
  change: ChangeDraft,
): boolean => {
  if (expect === "available") return change.changeKind === CHANGE_KIND.appeared
  if (expect === "unavailable") return change.changeKind === CHANGE_KIND.disappeared
  return change.changeKind === CHANGE_KIND.appeared || change.changeKind === CHANGE_KIND.disappeared
}

const hoursSince = (from: Date, now: Date): number =>
  (now.getTime() - from.getTime()) / MILLIS_PER_HOUR

const matchRunLevel = (
  trigger: TriggerConfig,
  context: TriggerContext,
): readonly ChangeDraft[] | null | undefined => {
  if (trigger.kind === TRIGGER_KIND.runFailed) return context.runFailed ? [] : null
  if (trigger.kind === TRIGGER_KIND.runRecovered) {
    return !context.runFailed && context.previousRunFailed ? [] : null
  }
  if (trigger.kind !== TRIGGER_KIND.noChangeFor) return undefined
  const since = context.lastChangeAt
  if (since === null) return null
  return hoursSince(since, context.now) >= trigger.hours ? [] : null
}

const matchChangeLevel = (
  trigger: TriggerConfig,
  candidates: readonly ChangeDraft[],
  context: TriggerContext,
): readonly ChangeDraft[] | null => {
  if (trigger.kind === TRIGGER_KIND.anyChange) return fired(context.changes)
  if (trigger.kind === TRIGGER_KIND.fieldChanged) return fired(candidates)
  if (trigger.kind === TRIGGER_KIND.numericThreshold) {
    return fired(
      candidates.filter(
        (change) =>
          change.newNumber !== null && compare(trigger.operator, change.newNumber, trigger.value),
      ),
    )
  }
  if (trigger.kind === TRIGGER_KIND.percentChange) {
    return fired(
      candidates.filter((change) => isPercentMatch(trigger.direction, trigger.percent, change)),
    )
  }
  if (trigger.kind === TRIGGER_KIND.textContains) {
    return fired(
      candidates.filter((change) => hasText(change, trigger.text, trigger.caseSensitive)),
    )
  }
  if (trigger.kind === TRIGGER_KIND.textNotContains) {
    return fired(
      candidates.filter((change) => !hasText(change, trigger.text, trigger.caseSensitive)),
    )
  }
  if (trigger.kind === TRIGGER_KIND.regexMatch) {
    const pattern = new RegExp(trigger.pattern, "u")
    return fired(candidates.filter((change) => pattern.test(textOf(change))))
  }
  if (trigger.kind === TRIGGER_KIND.availability) {
    return fired(candidates.filter((change) => isAvailabilityMatch(trigger.expect, change)))
  }
  return fired(candidates)
}

export const matchTrigger = (
  trigger: TriggerConfig,
  extractorKey: ExtractorKey | null,
  context: TriggerContext,
): readonly ChangeDraft[] | null => {
  const runLevel = matchRunLevel(trigger, context)
  if (runLevel !== undefined) return runLevel
  if (context.runFailed) return null
  return matchChangeLevel(trigger, forKey(context.changes, extractorKey), context)
}
