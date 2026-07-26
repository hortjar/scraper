import { blankToUndefined } from "@scraper/core/config"

import type { ErasedNotificationChannel } from "./notifications.types.js"

export interface SplitConfig {
  readonly publicConfig: Record<string, unknown>
  readonly secretPlaintext: string | null
}

export const splitSecret = (
  channel: ErasedNotificationChannel,
  fullConfig: Record<string, unknown>,
): SplitConfig => {
  const secretField = blankToUndefined(channel.secretFields[0])
  if (secretField === undefined) return { publicConfig: fullConfig, secretPlaintext: null }
  const { [secretField]: secretValue, ...publicConfig } = fullConfig
  return {
    publicConfig,
    secretPlaintext: typeof secretValue === "string" ? secretValue : null,
  }
}

export const mergeSecret = (
  channel: ErasedNotificationChannel,
  publicConfig: Record<string, unknown>,
  secretPlaintext: string | null,
): Record<string, unknown> => {
  const secretField = blankToUndefined(channel.secretFields[0])
  if (secretField === undefined || secretPlaintext === null) return publicConfig
  return { ...publicConfig, [secretField]: secretPlaintext }
}
