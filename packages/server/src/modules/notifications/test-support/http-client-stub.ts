import { Effect, Layer } from "effect"

import type {
  HttpRequestFailed,
  HttpRequestInput,
  HttpResponse,
} from "../channels/http-client.service.js"
import { NotificationsHttpClient } from "../channels/http-client.service.js"

export const stubHttpClient = (
  handler: (input: HttpRequestInput) => Effect.Effect<HttpResponse, HttpRequestFailed>,
): Layer.Layer<NotificationsHttpClient> =>
  Layer.succeed(NotificationsHttpClient, NotificationsHttpClient.make({ request: handler }))

export const respondingWith = (
  status: number,
  bodyText = "",
): Layer.Layer<NotificationsHttpClient> =>
  stubHttpClient(() => Effect.succeed({ status, bodyText }))
