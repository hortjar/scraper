import type auth from "./locales/en/auth.json"
import type channels from "./locales/en/channels.json"
import type common from "./locales/en/common.json"
import type errors from "./locales/en/errors.json"
import type landing from "./locales/en/landing.json"
import type monitors from "./locales/en/monitors.json"
import type runs from "./locales/en/runs.json"
import type settings from "./locales/en/settings.json"

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common"
    returnNull: false
    resources: {
      auth: typeof auth
      channels: typeof channels
      common: typeof common
      errors: typeof errors
      landing: typeof landing
      monitors: typeof monitors
      runs: typeof runs
      settings: typeof settings
    }
  }
}

export {}
