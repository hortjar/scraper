import { useSelector } from "@tanstack/react-store"
import { Store } from "@tanstack/store"

import { type LocaleCode, isLocaleCode } from "../i18n/resources"
import { THEME_PREFERENCE, type ThemePreference, applyDocumentTheme } from "../lib/browser"
import { appConfig } from "../lib/config"

import { hydrate, persist } from "./persist"

export interface PreferencesState {
  readonly theme: ThemePreference
  readonly locale: LocaleCode
}

const NAME = "preferences"

const isThemePreference = (value: unknown): value is ThemePreference =>
  typeof value === "string" && Object.hasOwn(THEME_PREFERENCE, value)

const isPreferencesState = (value: unknown): value is PreferencesState => {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Partial<Record<keyof PreferencesState, unknown>>
  return isThemePreference(candidate.theme) && isLocaleCode(candidate.locale)
}

const fallbackLocale: LocaleCode = isLocaleCode(appConfig.defaultLocale)
  ? appConfig.defaultLocale
  : "en"

const defaults: PreferencesState = { theme: THEME_PREFERENCE.system, locale: fallbackLocale }

export const preferencesStore = persist(
  new Store<PreferencesState>(hydrate(NAME, defaults, isPreferencesState)),
  NAME,
)

export const usePreferences = <T>(selector: (state: PreferencesState) => T): T =>
  useSelector(preferencesStore, selector)

export const useTheme = (): ThemePreference => usePreferences((state) => state.theme)

export const usePreferredLocale = (): LocaleCode => usePreferences((state) => state.locale)

export const setTheme = (theme: ThemePreference): void => {
  preferencesStore.setState((state) => ({ ...state, theme }))
  applyDocumentTheme(theme)
}

export const setPreferredLocale = (locale: LocaleCode): void => {
  preferencesStore.setState((state) => ({ ...state, locale }))
}

export const applyStoredTheme = (): void => {
  applyDocumentTheme(preferencesStore.state.theme)
}
