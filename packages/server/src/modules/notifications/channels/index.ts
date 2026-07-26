import { Layer } from "effect"

import { eraseChannel } from "../notifications.types.js"

import { discordChannel } from "./discord/channel.js"
import { emailChannel } from "./email/channel.js"
import { ChannelSet } from "./registry.service.js"
import { slackChannel } from "./slack/channel.js"
import { telegramChannel } from "./telegram/channel.js"
import { webhookChannel } from "./webhook/channel.js"

export const ChannelSetLive = Layer.succeed(ChannelSet, [
  eraseChannel(emailChannel),
  eraseChannel(webhookChannel),
  eraseChannel(slackChannel),
  eraseChannel(discordChannel),
  eraseChannel(telegramChannel),
])

export { NotificationsHttpClient, NotificationsHttpClientLive } from "./http-client.service.js"
export { ChannelRegistry, ChannelRegistryLive, ChannelSet } from "./registry.service.js"
export { discordChannel } from "./discord/channel.js"
export { emailChannel } from "./email/channel.js"
export { slackChannel } from "./slack/channel.js"
export { telegramChannel } from "./telegram/channel.js"
export { webhookChannel } from "./webhook/channel.js"
