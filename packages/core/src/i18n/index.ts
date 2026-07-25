import { Effect } from "effect"
import { IntlMessageFormat } from "intl-messageformat"

import { LOCALE } from "../constants/domain-values.js"
import { SERVICE_TAG } from "../constants/service-tags.js"

import { cs } from "./locales/cs.js"
import { en, type Catalog } from "./locales/en.js"

export * from "./keys.js"

export type SupportedLocale = (typeof LOCALE)[keyof typeof LOCALE]

export type MessageParams = Readonly<Record<string, string | number | Date>>

const CATALOGS: Record<SupportedLocale, Catalog> = { en, cs }

const FALLBACK_LOCALE: SupportedLocale = LOCALE.en

export const isSupportedLocale = (value: string): value is SupportedLocale => value in CATALOGS

export const resolveLocale = (
  preferred: string | null | undefined,
  acceptLanguage: string | null | undefined,
  fallback: string,
): SupportedLocale => {
  if (preferred && isSupportedLocale(preferred)) return preferred
  for (const part of (acceptLanguage ?? "").split(",")) {
    const tag = part.split(";")[0]?.trim().split("-")[0]
    if (tag && isSupportedLocale(tag)) return tag
  }
  return isSupportedLocale(fallback) ? fallback : FALLBACK_LOCALE
}

const formatterCache = new Map<string, IntlMessageFormat>()

const formatWith = (locale: SupportedLocale, key: string, params: MessageParams): string => {
  const catalog = CATALOGS[locale]
  const template = catalog[key as keyof Catalog] ?? en[key as keyof Catalog]
  if (!template) return key

  const cacheKey = `${locale}:${key}`
  let formatter = formatterCache.get(cacheKey)
  if (!formatter) {
    formatter = new IntlMessageFormat(template, locale)
    formatterCache.set(cacheKey, formatter)
  }
  const output = formatter.format(params)
  return Array.isArray(output) ? output.join("") : String(output)
}

export class Translator extends Effect.Service<Translator>()(SERVICE_TAG.Translator, {
  succeed: {
    render: (key: string, params: MessageParams = {}, locale: SupportedLocale = FALLBACK_LOCALE) =>
      formatWith(locale, key, params),
    has: (key: string, locale: SupportedLocale) => key in CATALOGS[locale],
    locales: () => Object.keys(CATALOGS) as readonly SupportedLocale[],
  },
}) {}

export const TranslatorLive = Translator.Default

export const catalogs = CATALOGS
export const fallbackLocale = FALLBACK_LOCALE
