import { Schema } from "effect"

import { HEALTH_STATUS, READY_STATUS } from "./system.constants.js"

export const HealthResponse = Schema.Struct({
  status: Schema.Literal(HEALTH_STATUS.ok),
  version: Schema.String,
  commit: Schema.String,
  builtAt: Schema.String,
  time: Schema.String,
})
export type HealthResponse = typeof HealthResponse.Type

export const ReadyChecks = Schema.Struct({
  database: Schema.Boolean,
  redis: Schema.Boolean,
})

export const ReadyResponse = Schema.Struct({
  status: Schema.Literal(READY_STATUS.ok, READY_STATUS.unhealthy),
  checks: ReadyChecks,
  time: Schema.String,
})
export type ReadyResponse = typeof ReadyResponse.Type

export const MetricsResponse = Schema.String

export const MetaResponse = Schema.Struct({
  locales: Schema.Array(Schema.String),
  defaultLocale: Schema.String,
  registrationOpen: Schema.Boolean,
  emailAvailable: Schema.Boolean,
  channelKinds: Schema.Array(Schema.String),
})
export type MetaResponse = typeof MetaResponse.Type
