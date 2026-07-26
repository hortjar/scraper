import {
  AppConfig,
  ENGINE,
  ExtractorMissing,
  MSG,
  RobotsDisallowed,
  SPAN,
  STRATEGY,
  TRANSFORM_KIND,
  type Extractor,
  type ExtractedField,
  type MonitorConfig,
  type PreviewResult,
  type PreviewWarning,
  type TransformFailed,
} from "@scraper/core"
import { Clock, Effect } from "effect"

import { parseFragment } from "../dom.types.js"
import type { RawExtraction } from "../extraction/extraction.js"
import { Extraction } from "../extraction/extraction.service.js"
import { ContentNormalizer } from "../normalize/content-normalizer.service.js"
import { RobotsCache } from "../robots/robots-cache.service.js"
import { PREVIEW_NORMALIZED_MAX_CHARS, TITLE_SELECTOR } from "../scraping.constants.js"
import type { ScrapeRequest } from "../scraping.schema.js"
import { UrlGuard } from "../security/url-guard.service.js"
import { shouldEscalate } from "../strategies/auto-escalation.js"
import { StrategyRegistry } from "../strategies/strategy-registry.service.js"
import { TransformPipeline } from "../transforms/transform-pipeline.service.js"

import { coerceList, coerceScalar, missingField } from "./coerce.js"

const hasRequiredMissing = (
  extractors: readonly Extractor[],
  raws: readonly RawExtraction[],
): boolean => {
  const requiredIndices = extractors
    .map((extractor, index) => ({ extractor, index }))
    .filter(({ extractor }) => extractor.required)
  if (requiredIndices.length === 0) return false
  return requiredIndices.every(({ index }) => raws[index]?.missing ?? true)
}

const extractTitle = (html: string): string | null => {
  const { document } = parseFragment(html)
  const title = document.querySelector(TITLE_SELECTOR)?.textContent ?? null
  if (title === null) return null
  const trimmed = title.trim()
  return trimmed === "" ? null : trimmed
}

const toScrapeRequest = (monitor: MonitorConfig): ScrapeRequest => ({
  url: monitor.url,
  request: monitor.request,
  browserOptions: monitor.browserOptions,
})

const processExtractor = (
  extractor: Extractor,
  raw: RawExtraction,
  transforms: TransformPipeline,
): Effect.Effect<ExtractedField, ExtractorMissing | TransformFailed> =>
  Effect.gen(function* () {
    if (extractor.required && raw.missing) {
      return yield* Effect.fail(
        new ExtractorMissing({ extractorKey: extractor.key, selector: extractor.selector }),
      )
    }

    if (raw.rawList !== null) {
      const transformed = yield* Effect.forEach(raw.rawList, (item) =>
        transforms.run(extractor.key, item, extractor.transforms),
      )
      return coerceList(extractor, raw.raw, transformed)
    }

    if (raw.raw === null) {
      const hasDefault = extractor.transforms.some(
        (step) => step.kind === TRANSFORM_KIND.defaultValue,
      )
      if (!hasDefault) return missingField(extractor, null)
    }

    const transformed = yield* transforms.run(extractor.key, raw.raw, extractor.transforms)
    return coerceScalar(extractor, raw.raw, transformed)
  })

export const previewScrape = Effect.fn(SPAN.scraping.preview)(function* (monitor: MonitorConfig) {
  const config = yield* AppConfig
  const urlGuard = yield* UrlGuard
  const robots = yield* RobotsCache
  const registry = yield* StrategyRegistry
  const extraction = yield* Extraction
  const transformPipeline = yield* TransformPipeline
  const normalizer = yield* ContentNormalizer

  const startedAtMs = yield* Clock.currentTimeMillis

  yield* urlGuard.check(monitor.url)

  const userAgent = monitor.request.userAgent ?? config.scraping.userAgent
  const warnings: PreviewWarning[] = []

  if (monitor.respectRobots) {
    const decision = yield* robots.check(monitor.url, userAgent)
    if (!decision.allowed) {
      return yield* Effect.fail(new RobotsDisallowed({ url: monitor.url }))
    }
  }

  const request = toScrapeRequest(monitor)
  const initialStrategy = yield* registry.resolve(monitor)

  let response = yield* initialStrategy.fetch(request)
  let strategyUsed = initialStrategy.kind
  let rawFields = yield* extraction.extractAll(
    response.html,
    monitor.contentSelector,
    monitor.extractors,
  )

  const canEscalate =
    monitor.engine === ENGINE.auto &&
    initialStrategy.kind === STRATEGY.http &&
    monitor.engineResolved === null

  if (canEscalate) {
    const isEscalate = shouldEscalate({
      httpStatus: response.httpStatus,
      html: response.html,
      byteLength: response.html.length,
      allRequiredExtractorsMissing: hasRequiredMissing(monitor.extractors, rawFields),
    })

    if (isEscalate) {
      warnings.push({ code: "escalated_to_browser", messageKey: MSG.warnings.jsRenderedDetected })
      response = yield* registry.browser.fetch(request)
      strategyUsed = STRATEGY.browser
      rawFields = yield* extraction.extractAll(
        response.html,
        monitor.contentSelector,
        monitor.extractors,
      )
    }
  }

  const fields = yield* Effect.forEach(monitor.extractors, (extractor, index) =>
    processExtractor(
      extractor,
      rawFields[index] ?? { raw: null, rawList: null, missing: true },
      transformPipeline,
    ),
  )

  const { normalized } = yield* normalizer.normalize(
    response.html,
    monitor.contentSelector,
    monitor.ignoreRules,
  )
  const durationMs = (yield* Clock.currentTimeMillis) - startedAtMs

  return {
    finalUrl: response.finalUrl,
    httpStatus: response.httpStatus,
    strategyUsed,
    title: extractTitle(response.html),
    durationMs,
    fields,
    normalizedPreview: normalized.slice(0, PREVIEW_NORMALIZED_MAX_CHARS),
    screenshotRef: null,
    warnings,
  } satisfies PreviewResult
})
