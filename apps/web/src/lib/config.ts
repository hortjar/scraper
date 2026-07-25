const FALLBACK_API_URL = "/api/v1"
const FALLBACK_APP_TITLE = "Scraper"
const FALLBACK_LOCALE = "en"

const runtime: AppRuntimeConfig = globalThis.window?.__APP_CONFIG__ ?? {}

export const appConfig = {
  apiUrl: runtime.apiUrl ?? FALLBACK_API_URL,
  appTitle: runtime.appTitle ?? FALLBACK_APP_TITLE,
  defaultLocale: runtime.defaultLocale ?? FALLBACK_LOCALE,
  version: __APP_VERSION__,
  commit: __GIT_SHA__,
} as const

export type AppConfig = typeof appConfig
