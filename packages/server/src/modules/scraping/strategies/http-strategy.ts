import { HEADER, SPAN, STRATEGY } from "@scraper/core"
import { Clock, Effect } from "effect"

import type { ScrapeRequest } from "../scraping.schema.js"

import { guardedFetch } from "./guarded-fetch.js"
import type { ScrapeStrategy } from "./strategy.types.js"

export interface HttpStrategyDependencies {
  readonly defaultUserAgent: string
  readonly defaultTimeoutMs: number
  readonly maxBytes: number
  readonly blockedHostPatterns: readonly string[]
}

const cookieHeader = (cookies: Readonly<Record<string, string>> | undefined): string | null =>
  cookies === undefined
    ? null
    : Object.entries(cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join("; ")

const buildHeaders = (request: ScrapeRequest, defaultUserAgent: string): Record<string, string> => {
  const headers: Record<string, string> = {
    ...request.request.headers,
    [HEADER.userAgent]: request.request.userAgent ?? defaultUserAgent,
  }
  const cookie = cookieHeader(request.request.cookies)
  if (cookie !== null) headers[HEADER.cookie] = cookie
  if (request.ifNoneMatch !== undefined) headers[HEADER.ifNoneMatch] = request.ifNoneMatch
  if (request.ifModifiedSince !== undefined) {
    headers[HEADER.ifModifiedSince] = request.ifModifiedSince
  }
  return headers
}

const acceptsEveryRequest: ScrapeStrategy["accepts"] = () => true

export const makeHttpStrategy = (dependencies: HttpStrategyDependencies): ScrapeStrategy => {
  const fetch = Effect.fn(SPAN.scraping.fetch)(function* (request: ScrapeRequest) {
    const startedAtMs = yield* Clock.currentTimeMillis
    const response = yield* guardedFetch(
      {
        url: request.url,
        method: request.request.method ?? "GET",
        headers: buildHeaders(request, dependencies.defaultUserAgent),
        body: request.request.body,
      },
      {
        timeoutMs: request.request.timeoutMs ?? dependencies.defaultTimeoutMs,
        maxBytes: dependencies.maxBytes,
        blockedHostPatterns: dependencies.blockedHostPatterns,
      },
    )
    const totalMs = (yield* Clock.currentTimeMillis) - startedAtMs

    return {
      html: response.body,
      finalUrl: response.finalUrl,
      httpStatus: response.status,
      headers: response.headers,
      strategy: STRATEGY.http,
      timings: { totalMs, ttfbMs: response.ttfbMs },
    }
  })

  return { kind: STRATEGY.http, accepts: acceptsEveryRequest, fetch }
}
