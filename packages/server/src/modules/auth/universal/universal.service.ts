import { AppConfig } from "@scraper/core/config"
import { SERVICE_TAG, SPAN, USER_ROLE } from "@scraper/core/constants"
import type { UserId, UserRole } from "@scraper/core/domain"
import { Unauthenticated } from "@scraper/core/errors"
import { Effect } from "effect"
import type { JWTVerifyGetKey } from "jose"

import { CREDENTIAL, DEFAULT_TIMEZONE, UNIVERSAL_PROVISION } from "../auth.constants.js"
import { sha256 } from "../auth.crypto.js"
import type { AuthActor } from "../auth.schema.js"
import { normalizeEmail } from "../auth.schema.js"
import { planLimitsFrom } from "../users/plan-limits.js"
import type { UserRecord } from "../users/user.repository.js"
import { UserRepository } from "../users/user.repository.js"

import { universalSettingsFrom } from "./universal.config.js"
import type { UniversalIdentity } from "./universal.verify.js"
import { remoteJwks, verifyAccessToken } from "./universal.verify.js"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID_GROUPS = [8, 4, 4, 4, 12] as const
const VERSION_BYTE = 6
const VARIANT_BYTE = 8
const VERSION_MASK = 0x0f
const VERSION_EIGHT = 0x80
const VARIANT_MASK = 0x3f
const VARIANT_RFC = 0x80
const UUID_BYTES = 16
const HEX = "hex"

export const localUserIdFor = (subject: string): string => {
  if (UUID_PATTERN.test(subject)) return subject.toLowerCase()
  const digest = Buffer.from(sha256(subject)).subarray(0, UUID_BYTES)
  digest[VERSION_BYTE] = ((digest[VERSION_BYTE] ?? 0) & VERSION_MASK) | VERSION_EIGHT
  digest[VARIANT_BYTE] = ((digest[VARIANT_BYTE] ?? 0) & VARIANT_MASK) | VARIANT_RFC
  const hex = digest.toString(HEX)
  let offset = 0
  return UUID_GROUPS.map((size) => {
    const part = hex.slice(offset, offset + size)
    offset += size
    return part
  }).join("-")
}

export const roleFrom = (identity: UniversalIdentity): UserRole =>
  identity.globalRole === USER_ROLE.admin || identity.roles.includes(USER_ROLE.admin)
    ? USER_ROLE.admin
    : USER_ROLE.user

export const actorFromUser = (user: UserRecord): AuthActor => ({
  userId: user.id,
  role: user.role,
  locale: user.locale,
  timezone: user.timezone,
  email: user.email,
  emailVerified: user.emailVerifiedAt !== null,
  scopes: [],
  credential: CREDENTIAL.universal,
  sessionId: null,
  apiKeyId: null,
})

export class UniversalAuth extends Effect.Service<UniversalAuth>()(SERVICE_TAG.UniversalAuth, {
  effect: Effect.gen(function* () {
    const config = yield* AppConfig
    const repository = yield* UserRepository
    const settings = universalSettingsFrom(config)
    const getKey: JWTVerifyGetKey | null = settings.enabled ? remoteJwks(settings) : null

    const provision = Effect.fn(SPAN.auth.provisionUser)(function* (identity: UniversalIdentity) {
      const id = localUserIdFor(identity.subject) as UserId
      const existing = yield* repository.findById(id)
      if (existing !== null) return existing

      const email = yield* normalizeEmail(identity.email)
      const byEmail = yield* repository.findByEmail(email)
      if (byEmail !== null) return byEmail

      return yield* repository
        .insert({
          id,
          email,
          passwordHash: UNIVERSAL_PROVISION.passwordHash,
          displayName: UNIVERSAL_PROVISION.displayNameFallback,
          timezone: DEFAULT_TIMEZONE,
          locale: config.app.defaultLocale,
          role: roleFrom(identity),
          planLimits: planLimitsFrom(config),
        })
        .pipe(
          Effect.catchTag("Conflict", () =>
            repository
              .findByEmail(email)
              .pipe(
                Effect.flatMap((found) =>
                  found === null
                    ? new Unauthenticated({ reason: "invalid" })
                    : Effect.succeed(found),
                ),
              ),
          ),
        )
    })

    const authenticate = Effect.fn(SPAN.auth.verifyBearer)(function* (token: string) {
      if (getKey === null) return yield* new Unauthenticated({ reason: "invalid" })
      const identity = yield* verifyAccessToken(getKey, settings, token)
      const user = yield* provision(identity)
      return actorFromUser(user)
    })

    return { enabled: settings.enabled, settings, authenticate, provision } as const
  }),
  dependencies: [AppConfig.Default, UserRepository.Default],
}) {}
