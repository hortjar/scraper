declare const __APP_VERSION__: string
declare const __GIT_SHA__: string

interface AppRuntimeConfig {
  readonly apiUrl?: string
  readonly appTitle?: string
  readonly defaultLocale?: string
  readonly appVersion?: string
  readonly gitSha?: string
}

declare var __APP_CONFIG__: AppRuntimeConfig | undefined

interface Window {
  __APP_CONFIG__?: AppRuntimeConfig
}
