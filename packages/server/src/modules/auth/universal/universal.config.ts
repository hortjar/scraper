import type { RootConfig } from "@scraper/core/config"
import { AUTH_MODE } from "@scraper/core/constants"

import { JWKS_PATH } from "../auth.constants.js"

export interface UniversalSettings {
  readonly enabled: boolean
  readonly serverUrl: string
  readonly issuer: string
  readonly audience: string
  readonly jwksUrl: string
}

export const universalSettingsFrom = (config: RootConfig): UniversalSettings => {
  const serverUrl = config.auth.universalUrl
  const isEnabled = config.auth.mode === AUTH_MODE.universal && serverUrl !== ""
  return {
    enabled: isEnabled,
    serverUrl,
    issuer: config.auth.issuer,
    audience: config.auth.universalApp,
    jwksUrl: isEnabled ? new URL(JWKS_PATH, serverUrl).href : "",
  }
}

export const isUniversalMode = (config: RootConfig): boolean =>
  config.auth.mode === AUTH_MODE.universal
