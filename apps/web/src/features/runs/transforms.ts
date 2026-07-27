import { DIFF_HUNK_KIND } from "./constants"
import { asBoolean, asNumber, asString, asStringList } from "./nullable"
import type {
  ChangeListItem,
  ChangeSummary,
  DiffHunk,
  DiffHunkKind,
  RunDetail,
  RunDetailResponse,
  RunFieldValue,
  RunFieldValueResponse,
  RunListItem,
  RunSummary,
} from "./types"

const DIFF_HUNK_KINDS: readonly DiffHunkKind[] = Object.values(DIFF_HUNK_KIND)

const isDiffHunkKind = (value: unknown): value is DiffHunkKind =>
  DIFF_HUNK_KINDS.includes(value as DiffHunkKind)

const asDiffHunk = (value: unknown): DiffHunk | null => {
  if (typeof value !== "object" || value === null) return null
  const candidate = value as Partial<Record<keyof DiffHunk, unknown>>
  if (!isDiffHunkKind(candidate.kind)) return null
  const text = asString(candidate.value)
  return text === null ? null : { kind: candidate.kind, value: text }
}

export const asDiffHunks = (value: unknown): readonly DiffHunk[] | null => {
  if (!Array.isArray(value)) return null
  const hunks: DiffHunk[] = []
  for (const entry of value) {
    const hunk = asDiffHunk(entry)
    if (hunk !== null) hunks.push(hunk)
  }
  return hunks
}

export const toRunSummary = (item: RunListItem): RunSummary => ({
  id: item.id,
  monitorId: item.monitorId,
  trigger: item.trigger,
  status: item.status,
  strategyUsed: asString(item.strategyUsed),
  startedAt: item.startedAt,
  finishedAt: asString(item.finishedAt),
  durationMs: asNumber(item.durationMs),
  httpStatus: asNumber(item.httpStatus),
  bytes: asNumber(item.bytes),
  changed: item.changed,
  errorKind: asString(item.errorKind),
  errorMessage: asString(item.errorMessage),
  attempt: item.attempt,
})

export const toRunFieldValue = (item: RunFieldValueResponse): RunFieldValue => ({
  extractorKey: item.extractorKey,
  raw: asString(item.raw),
  valueText: asString(item.valueText),
  valueNumber: asNumber(item.valueNumber),
  valueBool: asBoolean(item.valueBool),
  valueList: asStringList(item.valueList),
  missing: item.missing,
})

export const toRunDetail = (item: RunDetailResponse): RunDetail => ({
  ...toRunSummary(item),
  fields: item.fields.map((field) => toRunFieldValue(field)),
})

export const toChangeSummary = (item: ChangeListItem): ChangeSummary => ({
  id: item.id,
  monitorId: item.monitorId,
  runId: item.runId,
  previousRunId: asString(item.previousRunId),
  extractorKey: asString(item.extractorKey),
  changeKind: item.changeKind,
  oldValue: asString(item.oldValue),
  newValue: asString(item.newValue),
  oldNumber: asNumber(item.oldNumber),
  newNumber: asNumber(item.newNumber),
  deltaAbsolute: asNumber(item.deltaAbsolute),
  deltaPercent: asNumber(item.deltaPercent),
  diff: asDiffHunks(item.diff),
  createdAt: item.createdAt,
})
