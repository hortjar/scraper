import i18next, { type i18n as I18nInstance } from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"

import { applyDocumentLocale } from "../lib/browser"
import { preferencesStore } from "../stores/preferences"

import {
  DEFAULT_NAMESPACE,
  NAMESPACES,
  SOURCE_LOCALE,
  SUPPORTED_LOCALES,
  resources,
} from "./resources"

const PREFERENCE_DETECTOR = "preferences"

const makePreferenceDetector = (): LanguageDetector => {
  const detector = new LanguageDetector()
  detector.addDetector({
    name: PREFERENCE_DETECTOR,
    lookup: () => preferencesStore.state.locale,
  })
  return detector
}

export const createI18n = (): I18nInstance => {
  const instance = i18next.createInstance()

  void instance
    .use(makePreferenceDetector())
    .use(initReactI18next)
    .init({
      resources,
      ns: NAMESPACES,
      defaultNS: DEFAULT_NAMESPACE,
      fallbackNS: DEFAULT_NAMESPACE,
      fallbackLng: SOURCE_LOCALE,
      supportedLngs: SUPPORTED_LOCALES,
      nonExplicitSupportedLngs: true,
      load: "languageOnly",
      detection: { order: [PREFERENCE_DETECTOR, "navigator"], caches: [] },
      interpolation: { escapeValue: false },
      returnNull: false,
    })

  applyDocumentLocale(instance.resolvedLanguage ?? SOURCE_LOCALE)

  return instance
}

export const i18n = createI18n()
