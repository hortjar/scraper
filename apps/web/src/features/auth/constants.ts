import type { ApiKeyScope } from "./types"

export const API_KEY_SCOPE = {
  monitorsRead: "monitors:read",
  monitorsWrite: "monitors:write",
  runsRead: "runs:read",
  channelsWrite: "channels:write",
} as const satisfies Record<string, ApiKeyScope>

export const API_KEY_SCOPES: readonly ApiKeyScope[] = Object.values(API_KEY_SCOPE)

export const API_KEY_SCOPE_LABEL_KEY = {
  "monitors:read": "apiKeys.scopes.monitorsRead",
  "monitors:write": "apiKeys.scopes.monitorsWrite",
  "runs:read": "apiKeys.scopes.runsRead",
  "channels:write": "apiKeys.scopes.channelsWrite",
} as const satisfies Record<ApiKeyScope, string>
