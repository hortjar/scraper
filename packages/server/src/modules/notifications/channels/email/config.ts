import { Email } from "@scraper/core/domain"
import { Schema } from "effect"

export const EmailConfig = Schema.Struct({
  to: Email,
})
export type EmailConfig = typeof EmailConfig.Type
