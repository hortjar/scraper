import { HttpUrl } from "@scraper/core/domain"
import { Schema } from "effect"

export const SlackConfig = Schema.Struct({
  webhookUrl: HttpUrl,
})
export type SlackConfig = typeof SlackConfig.Type
