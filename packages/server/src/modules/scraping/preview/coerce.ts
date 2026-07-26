import { VALUE_TYPE, type Extractor, type ExtractedField } from "@scraper/core"

export type CoerceSpec = Pick<Extractor, "key" | "valueType">

const BOOLEAN_TRUE_PATTERN = /^(true|yes|1|in[ _]?stock|available)$/i

const toNumber = (text: string): number | null => {
  const cleaned = text.replaceAll(/[^0-9.-]/g, "")
  if (cleaned === "" || cleaned === "-") return null
  const parsed = Number(cleaned)
  return Number.isNaN(parsed) ? null : parsed
}

export const missingField = (spec: CoerceSpec, raw: string | null): ExtractedField => ({
  key: spec.key,
  raw,
  valueText: null,
  valueNumber: null,
  valueBool: null,
  valueList: null,
  missing: true,
})

export const coerceScalar = (
  spec: CoerceSpec,
  raw: string | null,
  value: string,
): ExtractedField => {
  if (spec.valueType === VALUE_TYPE.number || spec.valueType === VALUE_TYPE.price) {
    return {
      key: spec.key,
      raw,
      valueText: value,
      valueNumber: toNumber(value),
      valueBool: null,
      valueList: null,
      missing: false,
    }
  }
  if (spec.valueType === VALUE_TYPE.boolean) {
    return {
      key: spec.key,
      raw,
      valueText: value,
      valueNumber: null,
      valueBool: BOOLEAN_TRUE_PATTERN.test(value.trim()),
      valueList: null,
      missing: false,
    }
  }
  return {
    key: spec.key,
    raw,
    valueText: value,
    valueNumber: null,
    valueBool: null,
    valueList: null,
    missing: false,
  }
}

export const coerceList = (
  spec: CoerceSpec,
  raw: string | null,
  values: readonly string[],
): ExtractedField => ({
  key: spec.key,
  raw,
  valueText: null,
  valueNumber: null,
  valueBool: null,
  valueList: values,
  missing: false,
})
