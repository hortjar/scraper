import authCs from "./locales/cs/auth.json"
import channelsCs from "./locales/cs/channels.json"
import commonCs from "./locales/cs/common.json"
import errorsCs from "./locales/cs/errors.json"
import landingCs from "./locales/cs/landing.json"
import monitorsCs from "./locales/cs/monitors.json"
import runsCs from "./locales/cs/runs.json"
import settingsCs from "./locales/cs/settings.json"
import authEn from "./locales/en/auth.json"
import channelsEn from "./locales/en/channels.json"
import commonEn from "./locales/en/common.json"
import errorsEn from "./locales/en/errors.json"
import landingEn from "./locales/en/landing.json"
import monitorsEn from "./locales/en/monitors.json"
import runsEn from "./locales/en/runs.json"
import settingsEn from "./locales/en/settings.json"

export const NAMESPACES = [
  "common",
  "errors",
  "auth",
  "monitors",
  "runs",
  "channels",
  "settings",
  "landing",
] as const

export type Namespace = (typeof NAMESPACES)[number]

export const DEFAULT_NAMESPACE = "common"

export const SOURCE_LOCALE = "en"

export const SUPPORTED_LOCALES = ["en", "cs"] as const

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]

export const isLocaleCode = (value: unknown): value is LocaleCode =>
  typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value)

export const resources = {
  en: {
    common: commonEn,
    errors: errorsEn,
    auth: authEn,
    monitors: monitorsEn,
    runs: runsEn,
    channels: channelsEn,
    settings: settingsEn,
    landing: landingEn,
  },
  cs: {
    common: commonCs,
    errors: errorsCs,
    auth: authCs,
    monitors: monitorsCs,
    runs: runsCs,
    channels: channelsCs,
    settings: settingsCs,
    landing: landingCs,
  },
} as const
