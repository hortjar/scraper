export const NOTIFICATIONS_PLUGIN_NAME = "notifications"

export const NOTIFICATIONS_OPERATION_ID = {
  listChannelKinds: "listChannelKinds",
  listChannels: "listChannels",
  createChannel: "createChannel",
  updateChannel: "updateChannel",
  deleteChannel: "deleteChannel",
  testChannel: "testChannel",
  listRules: "listRules",
  createRule: "createRule",
  updateRule: "updateRule",
  deleteRule: "deleteRule",
  listDeliveries: "listDeliveries",
  retryDelivery: "retryDelivery",
} as const

export const STUB_AUTH_HEADER = "x-user-id"

export const LOCAL_SERVICE_TAG = {
  HttpClient: "notifications/HttpClient",
} as const

export const SECRET_MASK = {
  hint: "••••",
} as const

export const HTTP_METHOD = {
  get: "GET",
  post: "POST",
  put: "PUT",
  patch: "PATCH",
} as const

export const WEBHOOK_DEFAULT_METHOD = HTTP_METHOD.post

export const RETRYABLE_HTTP_STATUS_FLOOR = 500
export const RATE_LIMITED_HTTP_STATUS = 429

export const TEMPLATE_DELIMITER = {
  open: "{{",
  close: "}}",
  eachOpenPrefix: "#each ",
  eachClose: "/each",
} as const

export const DISPATCH_RESULT = {
  sent: "sent",
  failed: "failed",
} as const

export const CHANNEL_ICON = {
  email: "mail",
  webhook: "webhook",
  slack: "slack",
  discord: "discord",
  telegram: "send",
} as const

export const WEBHOOK_EVENT_NAME = "change.detected"

export const APP_NAME = "Scraper"

export const VERIFICATION_PING_TEXT = `Test message from ${APP_NAME}. This channel is set up correctly.`
