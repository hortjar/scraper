import { HttpUrl } from "@scraper/core/domain"
import { Schema } from "effect"

export const DiscordConfig = Schema.Struct({
  webhookUrl: HttpUrl,
})
export type DiscordConfig = typeof DiscordConfig.Type
