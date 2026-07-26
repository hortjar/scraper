import { Schema } from "effect"

export const TelegramConfig = Schema.Struct({
  botToken: Schema.String.pipe(Schema.minLength(10)),
  chatId: Schema.String.pipe(Schema.minLength(1)),
})
export type TelegramConfig = typeof TelegramConfig.Type
