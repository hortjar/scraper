import { CHANGE_KIND, VALUE_TYPE } from "@scraper/core/constants"
import type { ChangeKind, DiffHunk, ExtractorKey, ValueType } from "@scraper/core/domain"

import { LIST_SEPARATOR, WHOLE_PAGE_KEY } from "../runs.constants.js"

import { diffText } from "./text-diff.js"

export interface FieldSnapshot {
  readonly valueText: string | null
  readonly valueNumber: number | null
  readonly valueBool: boolean | null
  readonly valueList: readonly string[] | null
  readonly missing: boolean
}

export interface ChangeDraft {
  readonly extractorKey: ExtractorKey | null
  readonly changeKind: ChangeKind
  readonly oldValue: string | null
  readonly newValue: string | null
  readonly oldNumber: number | null
  readonly newNumber: number | null
  readonly deltaAbsolute: number | null
  readonly deltaPercent: number | null
  readonly diff: readonly DiffHunk[] | null
}

const emptyDraft = {
  oldValue: null,
  newValue: null,
  oldNumber: null,
  newNumber: null,
  deltaAbsolute: null,
  deltaPercent: null,
  diff: null,
} as const

const draft = (
  extractorKey: ExtractorKey | null,
  changeKind: ChangeKind,
  fields: Partial<ChangeDraft>,
): ChangeDraft => ({ ...emptyDraft, extractorKey, changeKind, ...fields })

const isPresent = (snapshot: FieldSnapshot): boolean => !snapshot.missing

const displayOf = (snapshot: FieldSnapshot): string | null => {
  if (snapshot.valueList !== null) return snapshot.valueList.join(LIST_SEPARATOR)
  if (snapshot.valueNumber !== null) return String(snapshot.valueNumber)
  if (snapshot.valueBool !== null) return String(snapshot.valueBool)
  return snapshot.valueText
}

export const percentChange = (previous: number, current: number): number | null =>
  previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100

const numericChange = (
  key: ExtractorKey,
  previous: FieldSnapshot,
  current: FieldSnapshot,
): ChangeDraft | null => {
  const before = previous.valueNumber
  const after = current.valueNumber
  if (before === null || after === null || before === after) return null
  return draft(key, after > before ? CHANGE_KIND.increased : CHANGE_KIND.decreased, {
    oldValue: displayOf(previous),
    newValue: displayOf(current),
    oldNumber: before,
    newNumber: after,
    deltaAbsolute: after - before,
    deltaPercent: percentChange(before, after),
  })
}

const booleanChange = (
  key: ExtractorKey,
  previous: FieldSnapshot,
  current: FieldSnapshot,
): ChangeDraft | null => {
  const before = previous.valueBool
  const after = current.valueBool
  if (before === null || after === null || before === after) return null
  return draft(key, after ? CHANGE_KIND.appeared : CHANGE_KIND.disappeared, {
    oldValue: String(before),
    newValue: String(after),
  })
}

export const listDifference = (
  previous: readonly string[],
  current: readonly string[],
): { readonly added: readonly string[]; readonly removed: readonly string[] } => {
  const before = new Set(previous)
  const after = new Set(current)
  return {
    added: current.filter((item) => !before.has(item)),
    removed: previous.filter((item) => !after.has(item)),
  }
}

const listChanges = (
  key: ExtractorKey,
  previous: FieldSnapshot,
  current: FieldSnapshot,
): readonly ChangeDraft[] => {
  const { added, removed } = listDifference(previous.valueList ?? [], current.valueList ?? [])
  const drafts: ChangeDraft[] = []
  if (removed.length > 0) {
    drafts.push(draft(key, CHANGE_KIND.disappeared, { oldValue: removed.join(LIST_SEPARATOR) }))
  }
  if (added.length > 0) {
    drafts.push(draft(key, CHANGE_KIND.appeared, { newValue: added.join(LIST_SEPARATOR) }))
  }
  return drafts
}

const textChange = (
  key: ExtractorKey,
  previous: FieldSnapshot,
  current: FieldSnapshot,
): ChangeDraft | null => {
  const before = displayOf(previous)
  const after = displayOf(current)
  if (before === after) return null
  return draft(key, CHANGE_KIND.modified, {
    oldValue: before,
    newValue: after,
    diff: diffText(before ?? "", after ?? ""),
  })
}

const presenceChange = (
  key: ExtractorKey,
  previous: FieldSnapshot,
  current: FieldSnapshot,
): ChangeDraft | null => {
  if (isPresent(previous) === isPresent(current)) return null
  return isPresent(current)
    ? draft(key, CHANGE_KIND.appeared, { newValue: displayOf(current) })
    : draft(key, CHANGE_KIND.disappeared, { oldValue: displayOf(previous) })
}

const byValueType = (
  valueType: ValueType,
  key: ExtractorKey,
  previous: FieldSnapshot,
  current: FieldSnapshot,
): readonly ChangeDraft[] => {
  if (valueType === VALUE_TYPE.number || valueType === VALUE_TYPE.price) {
    const change = numericChange(key, previous, current)
    return change === null ? [] : [change]
  }
  if (valueType === VALUE_TYPE.boolean) {
    const change = booleanChange(key, previous, current)
    return change === null ? [] : [change]
  }
  if (valueType === VALUE_TYPE.list) return listChanges(key, previous, current)
  const change = textChange(key, previous, current)
  return change === null ? [] : [change]
}

export const diffField = (
  key: ExtractorKey,
  valueType: ValueType,
  previous: FieldSnapshot,
  current: FieldSnapshot,
): readonly ChangeDraft[] => {
  const presence = presenceChange(key, previous, current)
  if (presence !== null) return [presence]
  if (!isPresent(current)) return []
  return byValueType(valueType, key, previous, current)
}

export const diffWholePage = (previous: string, current: string): readonly ChangeDraft[] => {
  if (previous === current) return []
  return [draft(WHOLE_PAGE_KEY, CHANGE_KIND.modified, { diff: diffText(previous, current) })]
}
