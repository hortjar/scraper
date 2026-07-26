import type {
  BlockedHost,
  ExtractorMissing,
  InvalidUrl,
  RobotsDisallowed,
  ScrapeFailed,
  SelectorInvalid,
  TransformFailed,
} from "@scraper/core"

export type UrlGuardError = InvalidUrl | BlockedHost

export type FetchError = ScrapeFailed | UrlGuardError | RobotsDisallowed

export type ExtractionError = ExtractorMissing | SelectorInvalid

export type ScrapingError = FetchError | ExtractionError | TransformFailed
