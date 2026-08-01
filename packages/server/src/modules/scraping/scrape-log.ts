import { LOG_EVENT, LOG_FIELD } from "@scraper/core/constants"
import type { PreviewWarning, ScrapeResponse, StrategyKind } from "@scraper/core/domain"
import { Effect } from "effect"

import type { RawExtraction } from "./extraction/extraction.js"

export const logRobotsDecision = (url: string, isAllowed: boolean) =>
  Effect.logDebug(LOG_EVENT.scrape.robots).pipe(
    Effect.annotateLogs({ [LOG_FIELD.url]: url, [LOG_FIELD.allowed]: isAllowed }),
  )

export const logStrategyResolved = (url: string, strategy: StrategyKind) =>
  Effect.logDebug(LOG_EVENT.scrape.strategy).pipe(
    Effect.annotateLogs({ [LOG_FIELD.url]: url, [LOG_FIELD.strategy]: strategy }),
  )

export const logFetched = (strategy: StrategyKind, response: ScrapeResponse) =>
  Effect.logInfo(LOG_EVENT.scrape.fetched).pipe(
    Effect.annotateLogs({
      [LOG_FIELD.strategy]: strategy,
      [LOG_FIELD.finalUrl]: response.finalUrl,
      [LOG_FIELD.httpStatus]: response.httpStatus,
      [LOG_FIELD.bytes]: response.html.length,
      [LOG_FIELD.durationMs]: response.timings.totalMs,
    }),
  )

export const logEscalated = (url: string) =>
  Effect.logInfo(LOG_EVENT.scrape.escalated).pipe(Effect.annotateLogs({ [LOG_FIELD.url]: url }))

export const logExtracted = (raws: readonly RawExtraction[]) =>
  Effect.logDebug(LOG_EVENT.scrape.extracted).pipe(
    Effect.annotateLogs({
      [LOG_FIELD.fieldCount]: raws.length,
      [LOG_FIELD.missingCount]: raws.filter((raw) => raw.missing).length,
    }),
  )

export const logWarnings = (warnings: readonly PreviewWarning[]) =>
  Effect.forEach(
    warnings,
    (warning) =>
      Effect.logWarning(LOG_EVENT.scrape.warning).pipe(
        Effect.annotateLogs({ [LOG_FIELD.warningCode]: warning.code }),
      ),
    { discard: true },
  )

export const logBrowserConnected = (url: string) =>
  Effect.logDebug(LOG_EVENT.browser.connected).pipe(Effect.annotateLogs({ [LOG_FIELD.url]: url }))

export const logBrowserNavigated = (url: string, httpStatus: number) =>
  Effect.logDebug(LOG_EVENT.browser.navigated).pipe(
    Effect.annotateLogs({ [LOG_FIELD.url]: url, [LOG_FIELD.httpStatus]: httpStatus }),
  )

export const logBrowserStep = (stepKind: string) =>
  Effect.logDebug(LOG_EVENT.browser.step).pipe(
    Effect.annotateLogs({ [LOG_FIELD.stepKind]: stepKind }),
  )

export const logBrowserCaptured = (bytes: number) =>
  Effect.logDebug(LOG_EVENT.browser.captured).pipe(
    Effect.annotateLogs({ [LOG_FIELD.bytes]: bytes }),
  )

export const logNormalized = (contentHash: string, length: number) =>
  Effect.logDebug(LOG_EVENT.scrape.normalized).pipe(
    Effect.annotateLogs({
      [LOG_FIELD.contentHash]: contentHash,
      [LOG_FIELD.bytes]: length,
    }),
  )
