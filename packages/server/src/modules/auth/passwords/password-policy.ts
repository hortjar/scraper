import type { RootConfig } from "@scraper/core/config"
import { SPAN } from "@scraper/core/constants"
import { PasswordRejected } from "@scraper/core/errors"
import { Effect } from "effect"

import { HIBP, PASSWORD_MIN_LENGTH } from "../auth.constants.js"
import { sha1Hex } from "../auth.crypto.js"
import { BreachCheckUnavailable } from "../auth.errors.js"

const HIBP_LINE_SEPARATOR = "\n"
const HIBP_FIELD_SEPARATOR = ":"

export const hasSuffix = (body: string, suffix: string): boolean =>
  body
    .split(HIBP_LINE_SEPARATOR)
    .some((line) => (line.split(HIBP_FIELD_SEPARATOR)[0] ?? "").trim() === suffix)

export const fetchBreachRange = (prefix: string): Effect.Effect<string, BreachCheckUnavailable> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(`${HIBP.rangeUrl}${prefix}`, {
        signal: AbortSignal.timeout(HIBP.timeoutMs),
      })
      if (!response.ok) throw new Error(String(response.status))
      return response.text()
    },
    catch: (cause) => new BreachCheckUnavailable({ detail: String(cause) }),
  })

export const checkBreached = Effect.fn(SPAN.auth.checkPasswordPolicy)(function* (plain: string) {
  const digest = sha1Hex(plain)
  const prefix = digest.slice(0, HIBP.prefixLength)
  const suffix = digest.slice(HIBP.prefixLength)
  const body = yield* fetchBreachRange(prefix)
  return hasSuffix(body, suffix)
})

export const assertPasswordAcceptable = Effect.fn(SPAN.auth.checkPasswordPolicy)(function* (
  config: RootConfig,
  plain: string,
) {
  if (plain.length < PASSWORD_MIN_LENGTH) {
    return yield* new PasswordRejected({ reason: "too_short", minLength: PASSWORD_MIN_LENGTH })
  }

  if (!config.security.passwordBreachCheck) return

  const isBreached = yield* checkBreached(plain).pipe(
    Effect.catchTag("BreachCheckUnavailable", () => Effect.succeed(false)),
  )
  if (isBreached) {
    return yield* new PasswordRejected({ reason: "breached", minLength: PASSWORD_MIN_LENGTH })
  }
})
