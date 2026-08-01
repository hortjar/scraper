import type { ExtractedField, Extractor, Monitor, MonitorConfig } from "@scraper/core/domain"
import type { AppError } from "@scraper/core/errors"
import { describeAppError } from "@scraper/core/observability"

import { diffField } from "./diff/field-diff.js"
import type { ChangeDraft, FieldSnapshot } from "./diff/field-diff.js"
import { BROWSER_UNAVAILABLE_REASON, UNKNOWN_ERROR_DETAIL } from "./runs.constants.js"
import type { FieldValueInput } from "./runs.repository.types.js"

const MISSING_SNAPSHOT: FieldSnapshot = {
  valueText: null,
  valueNumber: null,
  valueBool: null,
  valueList: null,
  missing: true,
}

export const toMonitorConfig = (
  monitor: Monitor,
  extractors: readonly Extractor[],
): MonitorConfig => ({
  id: monitor.id,
  url: monitor.url,
  engine: monitor.engine,
  engineResolved: monitor.engineResolved,
  request: monitor.request,
  browserOptions: monitor.browserOptions,
  contentSelector: monitor.contentSelector,
  ignoreRules: monitor.ignoreRules,
  respectRobots: monitor.respectRobots,
  extractors,
})

export const toFieldValueInput = (field: ExtractedField): FieldValueInput => ({
  extractorKey: field.key,
  raw: field.raw,
  valueText: field.valueText,
  valueNumber: field.valueNumber,
  valueBool: field.valueBool,
  valueList: field.valueList,
  missing: field.missing,
})

export interface StoredFieldValue {
  readonly extractorKey: string
  readonly valueText: string | null
  readonly valueNumber: string | null
  readonly valueBool: boolean | null
  readonly valueList: string[] | null
  readonly missing: boolean
}

export const asSnapshot = (field: StoredFieldValue): FieldSnapshot => ({
  valueText: field.valueText,
  valueNumber: field.valueNumber === null ? null : Number(field.valueNumber),
  valueBool: field.valueBool,
  valueList: field.valueList,
  missing: field.missing,
})

export const asCurrentSnapshot = (field: ExtractedField): FieldSnapshot => ({
  valueText: field.valueText,
  valueNumber: field.valueNumber,
  valueBool: field.valueBool,
  valueList: field.valueList,
  missing: field.missing,
})

export const previousByKey = (
  stored: readonly StoredFieldValue[],
): ReadonlyMap<string, FieldSnapshot> =>
  new Map(stored.map((field) => [field.extractorKey, asSnapshot(field)]))

export const draftFieldChanges = (
  extractors: readonly Extractor[],
  previous: ReadonlyMap<string, FieldSnapshot>,
  current: readonly ExtractedField[],
): readonly ChangeDraft[] =>
  extractors.flatMap((extractor) => {
    const after = current.find((field) => field.key === extractor.key)
    if (after === undefined) return []
    return diffField(
      extractor.key,
      extractor.valueType,
      previous.get(extractor.key) ?? MISSING_SNAPSHOT,
      asCurrentSnapshot(after),
    )
  })

export const isOperatorFault = (error: AppError): boolean =>
  error._tag === "ScrapeFailed" &&
  (error as { reason?: string }).reason === BROWSER_UNAVAILABLE_REASON

export const reasonOf = (error: AppError): string | null => {
  const reason = (error as { reason?: unknown }).reason
  return typeof reason === "string" && reason !== "" ? reason : null
}

export const detailOf = (error: AppError): string => {
  const described = describeAppError(error)
  return described === error._tag ? UNKNOWN_ERROR_DETAIL : described
}
