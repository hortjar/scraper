import { PATTERN, TRANSFORM_KIND, type Transform } from "@scraper/core"
import { Either } from "effect"

import { queryJsonPath, type JsonValue } from "../extraction/jsonpath.js"
import {
  CURRENCY_SYMBOL_MAP,
  DEFAULT_REGEX_EXTRACT_GROUP,
  HTML_TAG_PATTERN,
} from "../scraping.constants.js"

export type StepResult = Either.Either<string, string>

const stripHtml = (value: string): string =>
  value
    .replace(PATTERN.scriptOrStyle, "")
    .replace(PATTERN.htmlComment, "")
    .replace(HTML_TAG_PATTERN, "")
    .replace(PATTERN.whitespaceRun, " ")
    .trim()

const regexExtract = (value: string, pattern: string, group: number): StepResult => {
  try {
    const match = new RegExp(pattern).exec(value)
    if (match === null) return Either.left("no_match")
    const captured = match[group]
    return captured === undefined ? Either.left("group_out_of_range") : Either.right(captured)
  } catch {
    return Either.left("invalid_pattern")
  }
}

const regexReplace = (value: string, pattern: string, replacement: string): StepResult => {
  try {
    return Either.right(value.replaceAll(new RegExp(pattern, "g"), () => replacement))
  } catch {
    return Either.left("invalid_pattern")
  }
}

const escapeRegExp = (value: string): string =>
  value.replaceAll(/[.*+?^${}()|[\]\\-]/g, String.raw`\$&`)

const parseNumber = (
  value: string,
  decimalSeparator: string,
  thousandsSeparator: string,
): StepResult => {
  const withoutThousands = value.replaceAll(new RegExp(escapeRegExp(thousandsSeparator), "g"), "")
  const withDot =
    decimalSeparator === "."
      ? withoutThousands
      : withoutThousands.replace(new RegExp(escapeRegExp(decimalSeparator)), ".")
  const cleaned = withDot.replaceAll(/[^0-9.-]/g, "")
  const parsed = Number(cleaned)
  return cleaned === "" || Number.isNaN(parsed)
    ? Either.left("not_a_number")
    : Either.right(String(parsed))
}

const detectCurrency = (value: string, override: string | undefined): string => {
  if (override !== undefined) return override
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOL_MAP)) {
    if (value.includes(symbol)) return code
  }
  return ""
}

const inferDecimalSeparator = (value: string): "." | "," => {
  const lastDot = value.lastIndexOf(".")
  const lastComma = value.lastIndexOf(",")
  if (lastDot === -1 && lastComma === -1) return "."
  return lastComma > lastDot ? "," : "."
}

const parsePrice = (value: string, currency: string | undefined): StepResult => {
  const decimalSeparator = inferDecimalSeparator(value)
  const thousandsSeparator = decimalSeparator === "." ? "," : "."
  const numeric = parseNumber(value, decimalSeparator, thousandsSeparator)
  if (Either.isLeft(numeric)) return numeric
  const detected = detectCurrency(value, currency)
  return Either.right(detected === "" ? numeric.right : `${numeric.right} ${detected}`)
}

const parseDate = (value: string): StepResult => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? Either.left("invalid_date")
    : Either.right(parsed.toISOString())
}

const mapValues = (value: string, mapping: Readonly<Record<string, string>>): StepResult => {
  const mapped = mapping[value]
  return mapped === undefined ? Either.left("unmapped_value") : Either.right(mapped)
}

const jsonPathStep = (value: string, path: string): StepResult => {
  try {
    const parsed = JSON.parse(value) as JsonValue
    const [first] = queryJsonPath(parsed, path)
    if (first === undefined) return Either.left("no_match")
    return Either.right(typeof first === "string" ? first : JSON.stringify(first))
  } catch {
    return Either.left("invalid_json")
  }
}

const PARAMETERLESS_STEPS = {
  [TRANSFORM_KIND.trim]: (value: string) => value.trim(),
  [TRANSFORM_KIND.lowercase]: (value: string) => value.toLowerCase(),
  [TRANSFORM_KIND.uppercase]: (value: string) => value.toUpperCase(),
  [TRANSFORM_KIND.collapseWhitespace]: (value: string) =>
    value.replace(PATTERN.whitespaceRun, " ").trim(),
  [TRANSFORM_KIND.stripHtml]: (value: string) => stripHtml(value),
} as const

type ParameterlessKind = keyof typeof PARAMETERLESS_STEPS
type ParameterlessTransform = Extract<Transform, { kind: ParameterlessKind }>
type ParameterizedTransform = Exclude<Transform, ParameterlessTransform>

const isParameterless = (step: Transform): step is ParameterlessTransform =>
  Object.hasOwn(PARAMETERLESS_STEPS, step.kind)

type ParameterizedHandlers = {
  readonly [K in ParameterizedTransform["kind"]]: (
    value: string,
    step: Extract<ParameterizedTransform, { kind: K }>,
  ) => StepResult
}

const PARAMETERIZED_STEPS: ParameterizedHandlers = {
  [TRANSFORM_KIND.regexExtract]: (value, step) =>
    regexExtract(value, step.pattern, step.group ?? DEFAULT_REGEX_EXTRACT_GROUP),
  [TRANSFORM_KIND.regexReplace]: (value, step) =>
    regexReplace(value, step.pattern, step.replacement),
  [TRANSFORM_KIND.slice]: (value, step) => Either.right(value.slice(step.start, step.end)),
  [TRANSFORM_KIND.parseNumber]: (value, step) =>
    parseNumber(value, step.decimal ?? ".", step.thousands ?? ","),
  [TRANSFORM_KIND.parsePrice]: (value, step) => parsePrice(value, step.currency),
  [TRANSFORM_KIND.parseDate]: (value) => parseDate(value),
  [TRANSFORM_KIND.mapValues]: (value, step) => mapValues(value, step.mapping),
  [TRANSFORM_KIND.defaultValue]: (value, step) => Either.right(value === "" ? step.value : value),
  [TRANSFORM_KIND.jsonPath]: (value, step) => jsonPathStep(value, step.path),
}

const applyParameterizedStep = (value: string, step: ParameterizedTransform): StepResult => {
  const handler = PARAMETERIZED_STEPS[step.kind] as (
    value: string,
    step: ParameterizedTransform,
  ) => StepResult
  return handler(value, step)
}

export const applyStep = (value: string, step: Transform): StepResult =>
  isParameterless(step)
    ? Either.right(PARAMETERLESS_STEPS[step.kind](value))
    : applyParameterizedStep(value, step)
