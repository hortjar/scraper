import { CHANGE_KIND } from "@scraper/core/constants"
import type { NotificationMessage } from "@scraper/core/domain"

import type { ChannelPayload } from "../../notifications.types.js"

const TITLE_MAX_LENGTH = 256

const DISCORD_COLOR = {
  decreased: 0x22_c5_5e,
  increased: 0xf5_9e_0b,
  appeared: 0x3b_82_f6,
  disappeared: 0x6b_72_80,
  modified: 0x58_65_f2,
} as const

const colorFor = (kind: string | undefined): number => {
  switch (kind) {
    case undefined: {
      return DISCORD_COLOR.modified
    }
    case CHANGE_KIND.decreased: {
      return DISCORD_COLOR.decreased
    }
    case CHANGE_KIND.increased: {
      return DISCORD_COLOR.increased
    }
    case CHANGE_KIND.appeared: {
      return DISCORD_COLOR.appeared
    }
    case CHANGE_KIND.disappeared: {
      return DISCORD_COLOR.disappeared
    }
    default: {
      return DISCORD_COLOR.modified
    }
  }
}

export interface DiscordEmbed {
  readonly title: string
  readonly description: string
  readonly url: string
  readonly color: number
  readonly fields: readonly {
    readonly name: string
    readonly value: string
    readonly inline: boolean
  }[]
}

export interface DiscordMessage {
  readonly embeds: readonly DiscordEmbed[]
}

export const buildDiscordMessage = (
  payload: ChannelPayload,
  message: NotificationMessage,
): DiscordMessage => ({
  embeds: [
    {
      title: payload.title.slice(0, TITLE_MAX_LENGTH),
      description: payload.summaryMarkdown,
      url: payload.url,
      color: colorFor(message.changes[0]?.changeKind),
      fields: payload.fields.map((field) => ({
        name: field.label,
        value: field.value,
        inline: true,
      })),
    },
  ],
})
