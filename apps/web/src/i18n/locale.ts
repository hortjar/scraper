import { applyDocumentLocale } from "../lib/browser"
import { setPreferredLocale } from "../stores/preferences"

import { i18n } from "./config"
import type { LocaleCode } from "./resources"

export const changeLocale = (locale: LocaleCode): void => {
  setPreferredLocale(locale)
  applyDocumentLocale(locale)
  void i18n.changeLanguage(locale)
}
