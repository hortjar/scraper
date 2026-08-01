import { type BlockedHost, HEADER, type InvalidUrl, ScrapeFailed } from "@scraper/core"
import { Clock, Duration, Effect } from "effect"

import {
  FOLLOWED_REDIRECT_STATUSES,
  MAX_REDIRECTS,
  SEE_OTHER_STATUS,
  TOO_LARGE_SENTINEL,
} from "../scraping.constants.js"
import { checkUrl } from "../security/url-guard.js"

export interface GuardedRequest {
  readonly url: string
  readonly method: string
  readonly headers: Readonly<Record<string, string>>
  readonly body?: string | undefined
}

export interface GuardedFetchOptions {
  readonly timeoutMs: number
  readonly maxBytes: number
  readonly blockedHostPatterns: readonly string[]
}

export interface GuardedResponse {
  readonly finalUrl: string
  readonly status: number
  readonly headers: Readonly<Record<string, string>>
  readonly body: string
  readonly ttfbMs: number
}

const headersToRecord = (headers: Headers): Record<string, string> => {
  const record: Record<string, string> = {}
  headers.forEach((value, key) => {
    record[key] = value
  })
  return record
}

const isTooLarge = (cause: unknown): boolean =>
  cause instanceof Error && cause.message === TOO_LARGE_SENTINEL

const readCapped = (response: Response, maxBytes: number): Effect.Effect<string, ScrapeFailed> =>
  Effect.tryPromise({
    try: async () => {
      const reader = response.body?.getReader()
      if (!reader) return response.text()

      const chunks: Uint8Array[] = []
      let total = 0
      for (;;) {
        const next = await reader.read()
        if (next.done) break
        const chunk = next.value as Uint8Array
        total += chunk.byteLength
        if (total > maxBytes) {
          await reader.cancel()
          throw new Error(TOO_LARGE_SENTINEL)
        }
        chunks.push(chunk)
      }
      return Buffer.concat(chunks).toString("utf8")
    },
    catch: (cause) =>
      isTooLarge(cause)
        ? new ScrapeFailed({
            reason: "too_large",
            retryable: false,
            detail: `response exceeded ${String(maxBytes)} bytes`,
          })
        : new ScrapeFailed({ reason: "network", retryable: true, detail: String(cause) }),
  })

const fetchOnce = (
  request: GuardedRequest,
  timeoutMs: number,
): Effect.Effect<Response, ScrapeFailed> =>
  Effect.tryPromise({
    try: (signal) =>
      fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: "manual",
        signal,
      }),
    catch: (cause) =>
      new ScrapeFailed({ reason: "network", retryable: true, detail: String(cause) }),
  }).pipe(
    Effect.timeoutFail({
      duration: Duration.millis(timeoutMs),
      onTimeout: () =>
        new ScrapeFailed({
          reason: "timeout",
          retryable: true,
          detail: `no response from ${request.url} within ${String(timeoutMs)}ms`,
        }),
    }),
  )

const isRedirectStatus = (status: number): boolean => FOLLOWED_REDIRECT_STATUSES.includes(status)

const nextRedirectRequest = (
  request: GuardedRequest,
  response: Response,
  blockedHostPatterns: readonly string[],
): Effect.Effect<GuardedRequest, ScrapeFailed | InvalidUrl | BlockedHost> =>
  Effect.gen(function* () {
    const location = response.headers.get(HEADER.location)
    if (location === null) {
      return yield* Effect.fail(
        new ScrapeFailed({
          reason: "navigation",
          retryable: false,
          httpStatus: response.status,
          detail: `redirect ${String(response.status)} from ${request.url} had no location header`,
        }),
      )
    }
    const nextUrl = new URL(location, request.url).href
    yield* checkUrl(nextUrl, blockedHostPatterns)
    const method = response.status === SEE_OTHER_STATUS ? "GET" : request.method
    return { ...request, url: nextUrl, method, body: method === "GET" ? undefined : request.body }
  })

const followRedirects = (
  request: GuardedRequest,
  hop: number,
  options: GuardedFetchOptions,
  startedAtMs: number,
): Effect.Effect<GuardedResponse, ScrapeFailed | InvalidUrl | BlockedHost> =>
  Effect.gen(function* () {
    const response = yield* fetchOnce(request, options.timeoutMs)
    const ttfbMs = (yield* Clock.currentTimeMillis) - startedAtMs

    if (isRedirectStatus(response.status)) {
      if (hop >= MAX_REDIRECTS) {
        return yield* Effect.fail(
          new ScrapeFailed({
            reason: "navigation",
            retryable: false,
            httpStatus: response.status,
            detail: `more than ${String(MAX_REDIRECTS)} redirects starting at ${request.url}`,
          }),
        )
      }
      const nextRequest = yield* nextRedirectRequest(request, response, options.blockedHostPatterns)
      return yield* followRedirects(nextRequest, hop + 1, options, startedAtMs)
    }

    const body = yield* readCapped(response, options.maxBytes)
    return {
      finalUrl: request.url,
      status: response.status,
      headers: headersToRecord(response.headers),
      body,
      ttfbMs,
    }
  })

export const guardedFetch = (
  request: GuardedRequest,
  options: GuardedFetchOptions,
): Effect.Effect<GuardedResponse, ScrapeFailed | InvalidUrl | BlockedHost> =>
  Effect.gen(function* () {
    yield* checkUrl(request.url, options.blockedHostPatterns)
    const startedAtMs = yield* Clock.currentTimeMillis
    return yield* followRedirects(request, 0, options, startedAtMs)
  })
