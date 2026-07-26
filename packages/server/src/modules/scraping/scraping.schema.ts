import { BrowserOptions, HttpUrl, RequestOptions } from "@scraper/core"
import { Schema } from "effect"

export const ScrapeRequest = Schema.Struct({
  url: HttpUrl,
  request: RequestOptions,
  browserOptions: BrowserOptions,
  ifNoneMatch: Schema.optional(Schema.String),
  ifModifiedSince: Schema.optional(Schema.String),
})
export type ScrapeRequest = typeof ScrapeRequest.Type

export const TransformResult = Schema.Struct({
  value: Schema.String,
})
export type TransformResult = typeof TransformResult.Type
