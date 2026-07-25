export const THEME_PREFERENCE = {
  system: "system",
  light: "light",
  dark: "dark",
} as const

export type ThemePreference = (typeof THEME_PREFERENCE)[keyof typeof THEME_PREFERENCE]

const THEME_ATTRIBUTE = "data-theme"

export const applyDocumentTheme = (theme: ThemePreference): void => {
  const root = document.documentElement
  if (theme === THEME_PREFERENCE.system) {
    root.removeAttribute(THEME_ATTRIBUTE)
    return
  }
  root.setAttribute(THEME_ATTRIBUTE, theme)
}

export const applyDocumentLocale = (locale: string): void => {
  document.documentElement.lang = locale
}
