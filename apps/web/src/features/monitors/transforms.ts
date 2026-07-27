import { MAPPING_SEPARATOR, TRANSFORM_KIND } from "./constants"
import type { TransformInput, TransformKind } from "./types"

export const TRANSFORM_FIELD = {
  pattern: "pattern",
  replacement: "replacement",
  group: "group",
  start: "start",
  end: "end",
  value: "value",
  path: "path",
  format: "format",
  timezone: "timezone",
  currency: "currency",
  locale: "locale",
  decimal: "decimal",
  thousands: "thousands",
  mapping: "mapping",
} as const

export type TransformFieldName = (typeof TRANSFORM_FIELD)[keyof typeof TRANSFORM_FIELD]

export const TRANSFORM_INPUT = {
  text: "text",
  number: "number",
  mapping: "mapping",
} as const

export type TransformInputKind = (typeof TRANSFORM_INPUT)[keyof typeof TRANSFORM_INPUT]

export interface TransformFieldSpec {
  readonly name: TransformFieldName
  readonly input: TransformInputKind
}

export type TransformValues = Readonly<Partial<Record<TransformFieldName, string>>>

const textField = (name: TransformFieldName): TransformFieldSpec => ({
  name,
  input: TRANSFORM_INPUT.text,
})

const numberField = (name: TransformFieldName): TransformFieldSpec => ({
  name,
  input: TRANSFORM_INPUT.number,
})

export const TRANSFORM_FIELDS: Readonly<Record<TransformKind, readonly TransformFieldSpec[]>> = {
  [TRANSFORM_KIND.trim]: [],
  [TRANSFORM_KIND.lowercase]: [],
  [TRANSFORM_KIND.uppercase]: [],
  [TRANSFORM_KIND.collapseWhitespace]: [],
  [TRANSFORM_KIND.stripHtml]: [],
  [TRANSFORM_KIND.regexExtract]: [
    textField(TRANSFORM_FIELD.pattern),
    numberField(TRANSFORM_FIELD.group),
  ],
  [TRANSFORM_KIND.regexReplace]: [
    textField(TRANSFORM_FIELD.pattern),
    textField(TRANSFORM_FIELD.replacement),
  ],
  [TRANSFORM_KIND.slice]: [numberField(TRANSFORM_FIELD.start), numberField(TRANSFORM_FIELD.end)],
  [TRANSFORM_KIND.parseNumber]: [
    textField(TRANSFORM_FIELD.decimal),
    textField(TRANSFORM_FIELD.thousands),
    textField(TRANSFORM_FIELD.locale),
  ],
  [TRANSFORM_KIND.parsePrice]: [textField(TRANSFORM_FIELD.currency)],
  [TRANSFORM_KIND.parseDate]: [
    textField(TRANSFORM_FIELD.format),
    textField(TRANSFORM_FIELD.timezone),
  ],
  [TRANSFORM_KIND.mapValues]: [{ name: TRANSFORM_FIELD.mapping, input: TRANSFORM_INPUT.mapping }],
  [TRANSFORM_KIND.defaultValue]: [textField(TRANSFORM_FIELD.value)],
  [TRANSFORM_KIND.jsonPath]: [textField(TRANSFORM_FIELD.path)],
}

const LINE_BREAK = /\r?\n/u

const read = (values: TransformValues, name: TransformFieldName): string =>
  (values[name] ?? "").trim()

const readInteger = (raw: string, fallback: number): number => {
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? Math.max(Math.trunc(parsed), 0) : fallback
}

const when = <T extends object>(isPresent: boolean, value: T): Partial<T> =>
  isPresent ? value : {}

export const parseMapping = (raw: string): Readonly<Record<string, string>> =>
  Object.fromEntries(
    raw
      .split(LINE_BREAK)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line): readonly [string, string] => {
        const separatorIndex = line.indexOf(MAPPING_SEPARATOR)
        return separatorIndex === -1
          ? [line, ""]
          : [line.slice(0, separatorIndex).trim(), line.slice(separatorIndex + 1).trim()]
      }),
  )

export const serializeMapping = (mapping: Readonly<Record<string, string>>): string =>
  Object.entries(mapping)
    .map(([key, value]) => `${key}${MAPPING_SEPARATOR}${value}`)
    .join("\n")

const BUILDERS: Readonly<Record<TransformKind, (values: TransformValues) => TransformInput>> = {
  [TRANSFORM_KIND.trim]: () => ({ kind: TRANSFORM_KIND.trim }),
  [TRANSFORM_KIND.lowercase]: () => ({ kind: TRANSFORM_KIND.lowercase }),
  [TRANSFORM_KIND.uppercase]: () => ({ kind: TRANSFORM_KIND.uppercase }),
  [TRANSFORM_KIND.collapseWhitespace]: () => ({ kind: TRANSFORM_KIND.collapseWhitespace }),
  [TRANSFORM_KIND.stripHtml]: () => ({ kind: TRANSFORM_KIND.stripHtml }),
  [TRANSFORM_KIND.regexExtract]: (values) => {
    const group = read(values, TRANSFORM_FIELD.group)
    return {
      kind: TRANSFORM_KIND.regexExtract,
      pattern: read(values, TRANSFORM_FIELD.pattern),
      ...when(group !== "", { group: readInteger(group, 0) }),
    }
  },
  [TRANSFORM_KIND.regexReplace]: (values) => ({
    kind: TRANSFORM_KIND.regexReplace,
    pattern: read(values, TRANSFORM_FIELD.pattern),
    replacement: read(values, TRANSFORM_FIELD.replacement),
  }),
  [TRANSFORM_KIND.slice]: (values) => {
    const end = read(values, TRANSFORM_FIELD.end)
    return {
      kind: TRANSFORM_KIND.slice,
      start: readInteger(read(values, TRANSFORM_FIELD.start), 0),
      ...when(end !== "", { end: readInteger(end, 0) }),
    }
  },
  [TRANSFORM_KIND.parseNumber]: (values) => {
    const decimal = read(values, TRANSFORM_FIELD.decimal)
    const thousands = read(values, TRANSFORM_FIELD.thousands)
    const locale = read(values, TRANSFORM_FIELD.locale)
    return {
      kind: TRANSFORM_KIND.parseNumber,
      ...when(decimal !== "", { decimal }),
      ...when(thousands !== "", { thousands }),
      ...when(locale !== "", { locale }),
    }
  },
  [TRANSFORM_KIND.parsePrice]: (values) => {
    const currency = read(values, TRANSFORM_FIELD.currency)
    return { kind: TRANSFORM_KIND.parsePrice, ...when(currency !== "", { currency }) }
  },
  [TRANSFORM_KIND.parseDate]: (values) => {
    const format = read(values, TRANSFORM_FIELD.format)
    const timezone = read(values, TRANSFORM_FIELD.timezone)
    return {
      kind: TRANSFORM_KIND.parseDate,
      ...when(format !== "", { format }),
      ...when(timezone !== "", { timezone }),
    }
  },
  [TRANSFORM_KIND.mapValues]: (values) => ({
    kind: TRANSFORM_KIND.mapValues,
    mapping: parseMapping(values[TRANSFORM_FIELD.mapping] ?? ""),
  }),
  [TRANSFORM_KIND.defaultValue]: (values) => ({
    kind: TRANSFORM_KIND.defaultValue,
    value: read(values, TRANSFORM_FIELD.value),
  }),
  [TRANSFORM_KIND.jsonPath]: (values) => ({
    kind: TRANSFORM_KIND.jsonPath,
    path: read(values, TRANSFORM_FIELD.path),
  }),
}

export const transformFields = (kind: TransformKind): readonly TransformFieldSpec[] =>
  TRANSFORM_FIELDS[kind]

export const toTransformPayload = (kind: TransformKind, values: TransformValues): TransformInput =>
  BUILDERS[kind](values)
