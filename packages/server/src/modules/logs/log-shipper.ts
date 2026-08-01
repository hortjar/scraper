import { redactValue } from "@scraper/core/observability"
import { HashMap, type Layer, Logger } from "effect"
import type Redis from "ioredis"

import { makeRecord } from "./log-record.js"
import { LOG_FIELD_RECORD, LOG_STREAM_KEY, LOG_STREAM_MAXLEN } from "./logs.constants.js"

const swallow = (): void => undefined

const asRecord = (annotations: HashMap.HashMap<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    HashMap.toEntries(annotations).map(([key, value]) => [key, redactValue(value)]),
  )

export const logShipperLayer = (client: Redis, service: string): Layer.Layer<never> =>
  Logger.add(
    Logger.make(({ annotations, date, logLevel, message }) => {
      const record = makeRecord({
        at: date,
        levelLabel: logLevel.label,
        service,
        message: Array.isArray(message) ? message.map(String).join(" ") : String(message),
        annotations: asRecord(annotations),
      })

      void client
        .xadd(
          LOG_STREAM_KEY,
          "MAXLEN",
          "~",
          LOG_STREAM_MAXLEN,
          "*",
          LOG_FIELD_RECORD,
          JSON.stringify(record),
        )
        .catch(swallow)
    }),
  )
