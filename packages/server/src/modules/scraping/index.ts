import { Layer } from "effect"

import { Extraction } from "./extraction/extraction.service.js"
import { ContentNormalizer } from "./normalize/content-normalizer.service.js"
import { RobotsCache } from "./robots/robots-cache.service.js"
import { UrlGuard } from "./security/url-guard.service.js"
import { BrowserStrategy } from "./strategies/browser-strategy.service.js"
import { HttpStrategy } from "./strategies/http-strategy.service.js"
import { StrategyRegistry } from "./strategies/strategy-registry.service.js"
import { TransformPipeline } from "./transforms/transform-pipeline.service.js"

export { Extraction } from "./extraction/extraction.service.js"
export {
  byOccurrence,
  scopeDocument,
  selectRaw,
  type ExtractorSpec,
} from "./extraction/extraction.js"
export { evaluateXPath } from "./extraction/xpath-lite.js"
export { queryJsonPath, type JsonValue } from "./extraction/jsonpath.js"

export { ContentNormalizer } from "./normalize/content-normalizer.service.js"
export { normalizeContent, type NormalizeResult } from "./normalize/content-normalizer.js"

export { previewScrape } from "./preview/preview-scrape.js"

export { RobotsCache } from "./robots/robots-cache.service.js"
export { evaluateRobots, parseRobotsTxt } from "./robots/robots.parser.js"

export { UrlGuard } from "./security/url-guard.service.js"
export { checkUrl } from "./security/url-guard.js"
export { isPrivateOrReservedAddress } from "./security/address-check.js"

export { BrowserStrategy } from "./strategies/browser-strategy.service.js"
export { HttpStrategy } from "./strategies/http-strategy.service.js"
export { StrategyRegistry } from "./strategies/strategy-registry.service.js"
export {
  guardedFetch,
  type GuardedRequest,
  type GuardedResponse,
} from "./strategies/guarded-fetch.js"
export type { ScrapeStrategy } from "./strategies/strategy.types.js"

export { TransformPipeline } from "./transforms/transform-pipeline.service.js"
export { runTransforms } from "./transforms/transform-pipeline.js"
export { applyStep } from "./transforms/transform-steps.js"

export * from "./scraping.errors.js"
export * from "./scraping.schema.js"

export const ScrapingLayer = Layer.mergeAll(
  Extraction.Default,
  ContentNormalizer.Default,
  TransformPipeline.Default,
  StrategyRegistry.Default,
  HttpStrategy.Default,
  BrowserStrategy.Default,
  UrlGuard.Default,
  RobotsCache.Default,
)
