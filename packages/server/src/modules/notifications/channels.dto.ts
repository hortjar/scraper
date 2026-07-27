import type { NotificationChannelRecord } from "@scraper/core/domain"

import type { ChannelDto } from "./channels.schema.js"

const iso = (value: Date): string => value.toISOString()

const isoOrNull = (value: Date | null): string | null => (value === null ? null : iso(value))

export const toChannelDto = (channel: NotificationChannelRecord): ChannelDto => ({
  id: channel.id,
  kind: channel.kind,
  name: channel.name,
  config: channel.config,
  hasSecret: channel.hasSecret,
  verifiedAt: isoOrNull(channel.verifiedAt),
  enabled: channel.enabled,
  failureCount: channel.failureCount,
  createdAt: iso(channel.createdAt),
  updatedAt: iso(channel.updatedAt),
})
