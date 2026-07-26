const FALLBACK_API_URL = "/api/v1"
const FALLBACK_APP_TITLE = "Scraper"
const FALLBACK_LOCALE = "en"

const runtime: AppRuntimeConfig = globalThis.__APP_CONFIG__ ?? {}

const blankToUndefined = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim()
  return trimmed === undefined || trimmed === "" ? undefined : trimmed
}

export const appConfig = {
  apiUrl: blankToUndefined(runtime.apiUrl) ?? FALLBACK_API_URL,
  appTitle: blankToUndefined(runtime.appTitle) ?? FALLBACK_APP_TITLE,
  defaultLocale: blankToUndefined(runtime.defaultLocale) ?? FALLBACK_LOCALE,
  version: blankToUndefined(runtime.appVersion) ?? __APP_VERSION__,
  commit: blankToUndefined(runtime.gitSha) ?? __GIT_SHA__,
} as const

export type AppConfig = typeof appConfig
