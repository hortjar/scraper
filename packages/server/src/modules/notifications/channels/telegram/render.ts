import type { ChannelPayload } from "../../notifications.types.js"

const MARKDOWN_V2_SPECIAL_CHARS = /[_*[\]()~`>#+\-=|{}.!]/g

export const escapeMarkdownV2 = (text: string): string =>
  text.replaceAll(MARKDOWN_V2_SPECIAL_CHARS, (char) => `\\${char}`)

export const buildTelegramText = (payload: ChannelPayload): string => {
  const lines = [
    `*${escapeMarkdownV2(payload.title)}*`,
    ...payload.fields.map(
      (field) => `*${escapeMarkdownV2(field.label)}*: ${escapeMarkdownV2(field.value)}`,
    ),
    `[${escapeMarkdownV2("View run")}](${payload.url})`,
  ]
  return lines.join("\n")
}
