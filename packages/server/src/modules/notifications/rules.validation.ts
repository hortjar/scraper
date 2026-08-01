import { DELIVERY_MODE } from "@scraper/core/constants"
import type { DeliveryMode } from "@scraper/core/domain"
import { ValidationFailed } from "@scraper/core/errors"
import { MSG } from "@scraper/core/i18n"

const DIGEST_CRON_PATH = ["digestCron"] as const

export interface DigestShape {
  readonly deliveryMode: DeliveryMode
  readonly digestCron: string | null
}

export const digestCronRejection = (rule: DigestShape): ValidationFailed | null =>
  rule.deliveryMode === DELIVERY_MODE.digest && rule.digestCron === null
    ? new ValidationFailed({
        issues: [{ path: DIGEST_CRON_PATH, messageKey: MSG.errors.digestCronRequired }],
      })
    : null

export const mergedDigestShape = (
  current: DigestShape,
  patch: {
    readonly deliveryMode?: DeliveryMode | undefined
    readonly digestCron?: string | null | undefined
  },
): DigestShape => ({
  deliveryMode: patch.deliveryMode ?? current.deliveryMode,
  digestCron: patch.digestCron === undefined ? current.digestCron : patch.digestCron,
})
