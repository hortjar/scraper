import { Data, Effect } from "effect"

import { LOCAL_SERVICE_TAG } from "../notifications.constants.js"

export class HttpRequestFailed extends Data.TaggedError("HttpRequestFailed")<{
  readonly reason: "network" | "timeout"
  readonly detail: string
}> {}

export interface HttpRequestInput {
  readonly url: string
  readonly method: string
  readonly headers: Readonly<Record<string, string>>
  readonly body?: string
  readonly timeoutMs: number
}

export interface HttpResponse {
  readonly status: number
  readonly bodyText: string
}

const performRequest = (input: HttpRequestInput): Effect.Effect<HttpResponse, HttpRequestFailed> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(input.url, {
        method: input.method,
        headers: input.headers,
        body: input.body,
        signal: AbortSignal.timeout(input.timeoutMs),
      })
      const bodyText = await response.text()
      return { status: response.status, bodyText }
    },
    catch: (cause) =>
      new HttpRequestFailed({
        reason: cause instanceof Error && cause.name === "TimeoutError" ? "timeout" : "network",
        detail: cause instanceof Error ? cause.message : String(cause),
      }),
  })

export class NotificationsHttpClient extends Effect.Service<NotificationsHttpClient>()(
  LOCAL_SERVICE_TAG.HttpClient,
  {
    succeed: {
      request: performRequest,
    },
  },
) {}

export const NotificationsHttpClientLive = NotificationsHttpClient.Default
