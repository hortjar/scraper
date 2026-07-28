import { OCCURRENCE, SELECTOR_KIND, SelectorInvalid, type Extractor } from "@scraper/core"
import { Effect } from "effect"

import { parseFragment, queryAll, type DomElement, type ParsedDocument } from "../dom.types.js"
import { JSON_LD_MAX_DOCUMENTS, JSON_LD_SELECTOR } from "../scraping.constants.js"

import { queryJsonPath, type JsonValue } from "./jsonpath.js"
import { evaluateXPath } from "./xpath-lite.js"

export type ExtractorSpec = Pick<
  Extractor,
  "selectorKind" | "selector" | "attribute" | "occurrence" | "occurrenceIndex"
>

export interface RawExtraction {
  readonly raw: string | null
  readonly rawList: readonly string[] | null
  readonly missing: boolean
  readonly matchCount: number
}

const stringifyJsonValue = (value: JsonValue): string =>
  typeof value === "string" ? value : JSON.stringify(value)

export const byOccurrence = (
  values: readonly string[],
  extractor: ExtractorSpec,
): RawExtraction => {
  const matchCount = values.length
  if (extractor.occurrence === OCCURRENCE.all) {
    return { raw: null, rawList: values, missing: matchCount === 0, matchCount }
  }
  if (matchCount === 0) return { raw: null, rawList: null, missing: true, matchCount }
  if (extractor.occurrence === OCCURRENCE.first) {
    return { raw: values[0] ?? null, rawList: null, missing: false, matchCount }
  }
  if (extractor.occurrence === OCCURRENCE.last) {
    return { raw: values.at(-1) ?? null, rawList: null, missing: false, matchCount }
  }
  const index = extractor.occurrenceIndex ?? 0
  const value = values[index]
  return value === undefined
    ? { raw: null, rawList: null, missing: true, matchCount }
    : { raw: value, rawList: null, missing: false, matchCount }
}

const readElementValues = (
  elements: readonly DomElement[],
  attribute: string | null,
): readonly string[] =>
  elements.map((element) =>
    attribute === null ? (element.textContent ?? "") : (element.getAttribute(attribute) ?? ""),
  )

const selectCss = (
  root: DomElement,
  extractor: ExtractorSpec,
): Effect.Effect<readonly string[], SelectorInvalid> =>
  Effect.try({
    try: () => readElementValues(queryAll(root, extractor.selector), extractor.attribute),
    catch: () => new SelectorInvalid({ selector: extractor.selector, kind: SELECTOR_KIND.css }),
  })

const selectXPath = (
  root: DomElement,
  extractor: ExtractorSpec,
): Effect.Effect<readonly string[], SelectorInvalid> =>
  Effect.try({
    try: () => evaluateXPath(root, extractor.selector),
    catch: () => new SelectorInvalid({ selector: extractor.selector, kind: SELECTOR_KIND.xpath }),
  })

const selectRegex = (
  scopedHtml: string,
  extractor: ExtractorSpec,
): Effect.Effect<readonly string[], SelectorInvalid> =>
  Effect.try({
    try: () => {
      const pattern = new RegExp(extractor.selector, "g")
      const matches: string[] = Array.from(
        scopedHtml.matchAll(pattern),
        (match) => match[1] ?? match[0],
      )
      return matches
    },
    catch: () => new SelectorInvalid({ selector: extractor.selector, kind: SELECTOR_KIND.regex }),
  })

const parseJsonLdDocuments = (root: DomElement): readonly JsonValue[] => {
  const scripts = queryAll(root, JSON_LD_SELECTOR).slice(0, JSON_LD_MAX_DOCUMENTS)
  const documents: JsonValue[] = []
  for (const script of scripts) {
    try {
      documents.push(JSON.parse(script.textContent ?? "null") as JsonValue)
    } catch {
      continue
    }
  }
  return documents
}

const selectJsonLd = (
  root: DomElement,
  extractor: ExtractorSpec,
): Effect.Effect<readonly string[], SelectorInvalid> =>
  Effect.try({
    try: () => {
      const path = extractor.selector.trim() === "" ? "$" : extractor.selector
      const results: string[] = []
      for (const document of parseJsonLdDocuments(root)) {
        for (const value of queryJsonPath(document, path)) results.push(stringifyJsonValue(value))
      }
      return results
    },
    catch: () => new SelectorInvalid({ selector: extractor.selector, kind: SELECTOR_KIND.jsonLd }),
  })

const selectJsonPath = (
  rawBody: string,
  extractor: ExtractorSpec,
): Effect.Effect<readonly string[], SelectorInvalid> =>
  Effect.try({
    try: () => {
      const parsed = JSON.parse(rawBody) as JsonValue
      return queryJsonPath(parsed, extractor.selector).map((value) => stringifyJsonValue(value))
    },
    catch: () =>
      new SelectorInvalid({ selector: extractor.selector, kind: SELECTOR_KIND.jsonpath }),
  })

export interface ScopedDocument {
  readonly document: ParsedDocument
  readonly root: DomElement
}

export const scopeDocument = (html: string, contentSelector: string | null): ScopedDocument => {
  const { body, document } = parseFragment(html)
  const trimmedSelector = contentSelector?.trim() ?? ""
  const root = trimmedSelector === "" ? body : (document.querySelector(trimmedSelector) ?? body)
  return { document, root }
}

export const selectRaw = (
  scoped: ScopedDocument,
  rawHtml: string,
  extractor: ExtractorSpec,
): Effect.Effect<RawExtraction, SelectorInvalid> =>
  Effect.gen(function* () {
    const values = yield* selectByKind(scoped, rawHtml, extractor)
    return byOccurrence(values, extractor)
  })

const selectByKind = (
  scoped: ScopedDocument,
  rawHtml: string,
  extractor: ExtractorSpec,
): Effect.Effect<readonly string[], SelectorInvalid> => {
  switch (extractor.selectorKind) {
    case SELECTOR_KIND.css: {
      return selectCss(scoped.root, extractor)
    }
    case SELECTOR_KIND.xpath: {
      return selectXPath(scoped.root, extractor)
    }
    case SELECTOR_KIND.regex: {
      return selectRegex(scoped.root.outerHTML ?? "", extractor)
    }
    case SELECTOR_KIND.jsonLd: {
      return selectJsonLd(scoped.root, extractor)
    }
    case SELECTOR_KIND.jsonpath: {
      return selectJsonPath(rawHtml, extractor)
    }
    case SELECTOR_KIND.wholePage: {
      return Effect.succeed([scoped.root.outerHTML ?? ""])
    }
    default: {
      return extractor.selectorKind satisfies never
    }
  }
}
