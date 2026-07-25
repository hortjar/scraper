import { Effect } from "effect"
import { IntlMessageFormat } from "intl-messageformat"

import { LOCALE } from "../constants/domain-values.js"
import { SERVICE_TAG } from "../constants/service-tags.js"

import { cs } from "./locales/cs.js"
import { en, type Catalog } from "./locales/en.js"

export * from "./keys.js"

export type SupportedLocale = (typeof LOCALE)[keyof typeof LOCALE]

export type MessageParameters = Readonly<Record<string, string | number | Date>>

const CATALOGS: Record<SupportedLocale, Catalog> = { en, cs }

const FALLBACK_LOCALE: SupportedLocale = LOCALE.en

export const isSupportedLocale = (value: string): value is SupportedLocale =>
  Object.hasOwn(CATALOGS, value)

export const resolveLocale = (
  preferred: string | null | undefined,
  acceptLanguage: string | null | undefined,
  fallback: string,
): SupportedLocale => {
  if (preferred && isSupportedLocale(preferred)) return preferred
  const accepted = (acceptLanguage ?? "").split(",")
  for (const part of accepted) {
    const tag = part.split(";", 1)[0]?.trim().split("-", 1)[0]
    if (tag && isSupportedLocale(tag)) return tag
  }
  return isSupportedLocale(fallback) ? fallback : FALLBACK_LOCALE
}

const formatterCache = new Map<string, IntlMessageFormat>()

const lookup = (catalog: Readonly<Record<string, string | undefined>>, key: string) => catalog[key]

const formatWith = (
  locale: SupportedLocale,
  key: string,
  parameters: MessageParameters,
): string => {
  const template = lookup(CATALOGS[locale], key) ?? lookup(en, key)
  if (!template) return key

  const cacheKey = `${locale}:${key}`
  let formatter = formatterCache.get(cacheKey)
  if (!formatter) {
    formatter = new IntlMessageFormat(template, locale)
    formatterCache.set(cacheKey, formatter)
  }
  const output = formatter.format(parameters)
  return Array.isArray(output) ? output.join("") : String(output)
}

export class Translator extends Effect.Service<Translator>()(SERVICE_TAG.Translator, {
  succeed: {
    render: (
      key: string,
      parameters: MessageParameters = {},
      locale: SupportedLocale = FALLBACK_LOCALE,
    ) => formatWith(locale, key, parameters),
    has: (key: string, locale: SupportedLocale) => Object.hasOwn(CATALOGS[locale], key),
    locales: () => Object.keys(CATALOGS) as readonly SupportedLocale[],
  },
}) {}

export const TranslatorLive = Translator.Default

export const catalogs = CATALOGS
export const fallbackLocale = FALLBACK_LOCALE
