import { API_KEY_SCOPE } from "@scraper/core/constants"

export const CHANNEL_ENTITY = "channel"

export const CHANNEL_PLUGIN = {
  routes: "channels/routes",
  handlers: "channels/handlers",
} as const

export const CHANNEL_PATH = {
  root: "",
  kinds: "/kinds",
  byId: "/:channelId",
  test: "/:channelId/test",
} as const

export const CHANNEL_SCOPE = {
  read: API_KEY_SCOPE.channelsWrite,
  write: API_KEY_SCOPE.channelsWrite,
} as const

export const CHANNEL_CONFIG_PATH = ["config"] as const

export const CHANNEL_RULE_REFERENCE_FIELD = "rules"
