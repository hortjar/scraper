import { ChannelDescriptor, ChannelId, NonEmptyString, NonNegativeInt } from "@scraper/core/domain"
import { Schema } from "effect"

const ChannelConfig = Schema.Record({ key: Schema.String, value: Schema.Unknown })

export const CreateChannelBody = Schema.Struct({
  kind: NonEmptyString,
  name: NonEmptyString,
  config: Schema.optionalWith(ChannelConfig, { default: () => ({}) }),
})
export type CreateChannelBody = typeof CreateChannelBody.Type

export const UpdateChannelBody = Schema.Struct({
  name: Schema.optional(NonEmptyString),
  config: Schema.optional(ChannelConfig),
  enabled: Schema.optional(Schema.Boolean),
})
export type UpdateChannelBody = typeof UpdateChannelBody.Type

export const ChannelIdParameters = Schema.Struct({ channelId: ChannelId })

export const ChannelDto = Schema.Struct({
  id: ChannelId,
  kind: Schema.String,
  name: Schema.String,
  config: ChannelConfig,
  hasSecret: Schema.Boolean,
  verifiedAt: Schema.NullOr(Schema.String),
  enabled: Schema.Boolean,
  failureCount: NonNegativeInt,
  createdAt: Schema.String,
  updatedAt: Schema.String,
})
export type ChannelDto = typeof ChannelDto.Type

export const ChannelListDto = Schema.Struct({ items: Schema.Array(ChannelDto) })

export const ChannelKindListDto = Schema.Struct({ items: Schema.Array(ChannelDescriptor) })

export const ChannelTestDto = Schema.Struct({
  channelId: ChannelId,
  verified: Schema.Boolean,
  testedAt: Schema.String,
})
export type ChannelTestDto = typeof ChannelTestDto.Type
