import type { ChannelPayload } from "../../notifications.types.js"

const HEADER_MAX_LENGTH = 150

interface SlackBlock {
  readonly type: string
  readonly text?: { readonly type: string; readonly text: string }
  readonly elements?: readonly { readonly type: string; readonly text: string }[]
}

export interface SlackMessage {
  readonly text: string
  readonly blocks: readonly SlackBlock[]
}

export const buildSlackMessage = (payload: ChannelPayload): SlackMessage => ({
  text: payload.summaryText,
  blocks: [
    {
      type: "header",
      text: { type: "plain_text", text: payload.title.slice(0, HEADER_MAX_LENGTH) },
    },
    ...payload.fields.map((field) => ({
      type: "section",
      text: { type: "mrkdwn", text: `*${field.label}*: ${field.value}` },
    })),
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `<${payload.url}|View run>` }],
    },
  ],
})
