import { Schema } from "effect"

export const LogRecordDto = Schema.Struct({
  at: Schema.String,
  level: Schema.String,
  service: Schema.String,
  message: Schema.String,
  annotations: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
})

export const LogListDto = Schema.Struct({
  source: Schema.Literal("stream", "persisted"),
  items: Schema.Array(LogRecordDto),
})
export type LogListDto = typeof LogListDto.Type
