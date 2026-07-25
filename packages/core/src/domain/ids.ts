import { Schema } from "effect"
import { v7 as uuidv7 } from "uuid"

const brandedId = <B extends string>(brand: B) => Schema.UUID.pipe(Schema.brand(brand))

export const UserId = brandedId("UserId")
export type UserId = typeof UserId.Type

export const SessionId = brandedId("SessionId")
export type SessionId = typeof SessionId.Type

export const ApiKeyId = brandedId("ApiKeyId")
export type ApiKeyId = typeof ApiKeyId.Type

export const MonitorId = brandedId("MonitorId")
export type MonitorId = typeof MonitorId.Type

export const ExtractorId = brandedId("ExtractorId")
export type ExtractorId = typeof ExtractorId.Type

export const RuleId = brandedId("RuleId")
export type RuleId = typeof RuleId.Type

export const ChannelId = brandedId("ChannelId")
export type ChannelId = typeof ChannelId.Type

export const RunId = brandedId("RunId")
export type RunId = typeof RunId.Type

export const SnapshotId = brandedId("SnapshotId")
export type SnapshotId = typeof SnapshotId.Type

export const ChangeId = brandedId("ChangeId")
export type ChangeId = typeof ChangeId.Type

export const DeliveryId = brandedId("DeliveryId")
export type DeliveryId = typeof DeliveryId.Type

export const TokenId = brandedId("TokenId")
export type TokenId = typeof TokenId.Type

export const newId = <A extends string>(schema: Schema.Schema<A, string>): A =>
  Schema.decodeSync(schema)(uuidv7())
