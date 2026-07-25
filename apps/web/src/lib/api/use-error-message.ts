import { useTranslation } from "react-i18next"

import { isApiError } from "./errors"

const KEY_SEPARATOR = "."
const NAMESPACE_SEPARATOR = ":"
const UNKNOWN_KEY = "unknown"

export const toNamespacedKey = (messageKey: string): string => {
  const separatorIndex = messageKey.indexOf(KEY_SEPARATOR)
  if (separatorIndex === -1) return `errors${NAMESPACE_SEPARATOR}${messageKey}`
  const namespace = messageKey.slice(0, separatorIndex)
  const rest = messageKey.slice(separatorIndex + 1)
  return `${namespace}${NAMESPACE_SEPARATOR}${rest}`
}

export const useErrorMessage = (): ((error: unknown) => string) => {
  const { t, i18n } = useTranslation("errors")
  const translate = t as unknown as (key: string, options?: Record<string, unknown>) => string

  return (error: unknown): string => {
    if (!isApiError(error)) return translate(UNKNOWN_KEY)

    const key = toNamespacedKey(error.messageKey)
    if (i18n.exists(key)) return translate(key, { ...error.messageParams })
    if (error.message.length > 0) return error.message
    return translate(UNKNOWN_KEY)
  }
}
