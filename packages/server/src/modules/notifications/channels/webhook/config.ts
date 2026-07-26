import { HttpUrl } from "@scraper/core/domain"
import { Schema } from "effect"

import { HTTP_METHOD, WEBHOOK_DEFAULT_METHOD } from "../../notifications.constants.js"

export const WebhookMethod = Schema.Literal(
  HTTP_METHOD.get,
  HTTP_METHOD.post,
  HTTP_METHOD.put,
  HTTP_METHOD.patch,
)
export type WebhookMethod = typeof WebhookMethod.Type

export const WebhookConfig = Schema.Struct({
  url: HttpUrl,
  secret: Schema.String.pipe(Schema.minLength(16)),
  method: Schema.optionalWith(WebhookMethod, { default: () => WEBHOOK_DEFAULT_METHOD }),
  headers: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.String }), {
    default: () => ({}),
  }),
})
export type WebhookConfig = typeof WebhookConfig.Type
