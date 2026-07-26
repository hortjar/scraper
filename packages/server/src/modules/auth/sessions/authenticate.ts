import { blankToUndefined, type RootConfig } from "@scraper/core/config"
import { PATTERN, SESSION, SPAN } from "@scraper/core/constants"
import type { Session } from "@scraper/core/domain"
import { Unauthenticated } from "@scraper/core/errors"
import { Clock, Effect } from "effect"

import { CREDENTIAL } from "../auth.constants.js"
import { sha256 } from "../auth.crypto.js"
import type { AuthActor } from "../auth.schema.js"
import type { ApiKeys } from "../keys/api-keys.service.js"
import type { UniversalAuth } from "../universal/universal.service.js"
import type { UserRecord, UserRepository } from "../users/user.repository.js"

import type { SessionRepository } from "./session.repository.js"

const MILLIS_PER_SECOND = 1000

export interface SessionsDependencies {
  readonly config: RootConfig
  readonly repository: SessionRepository
  readonly users: UserRepository
  readonly apiKeys: ApiKeys
  readonly universal: UniversalAuth
}

export interface Credentials {
  readonly cookieToken: string | null
  readonly bearerToken: string | null
}

export const bearerFrom = (header: string | null | undefined): string | null => {
  const authorization = blankToUndefined(header)
  if (authorization === undefined) return null
  const match = PATTERN.bearerToken.exec(authorization)
  return match?.[1]?.trim() ?? null
}

export const absoluteDeadline = (session: Session, config: RootConfig): Date =>
  new Date(
    session.createdAt.getTime() + config.security.sessionAbsoluteTtlSeconds * MILLIS_PER_SECOND,
  )

export const slidingExpiry = (session: Session, config: RootConfig, now: Date): Date => {
  const sliding = now.getTime() + config.security.sessionTtlSeconds * MILLIS_PER_SECOND
  return new Date(Math.min(sliding, absoluteDeadline(session, config).getTime()))
}

export const shouldRefresh = (session: Session, now: Date): boolean =>
  now.getTime() - session.lastSeenAt.getTime() >= SESSION.refreshIntervalMs

export const actorFromSession = (user: UserRecord, session: Session): AuthActor => ({
  userId: user.id,
  role: user.role,
  locale: user.locale,
  timezone: user.timezone,
  email: user.email,
  emailVerified: user.emailVerifiedAt !== null,
  scopes: [],
  credential: CREDENTIAL.session,
  sessionId: session.id,
  apiKeyId: null,
})

export const makeAuthenticateCookie = (dependencies: SessionsDependencies) =>
  Effect.fn(SPAN.auth.authenticate)(function* (token: string) {
    const session = yield* dependencies.repository.findByTokenHash(sha256(token))
    if (session === null) return yield* new Unauthenticated({ reason: "invalid" })
    if (session.revokedAt !== null) return yield* new Unauthenticated({ reason: "revoked" })

    const now = new Date(yield* Clock.currentTimeMillis)
    if (session.expiresAt <= now || absoluteDeadline(session, dependencies.config) <= now) {
      return yield* new Unauthenticated({ reason: "expired" })
    }

    const user = yield* dependencies.users.findById(session.userId)
    if (user === null) return yield* new Unauthenticated({ reason: "revoked" })

    if (shouldRefresh(session, now)) {
      yield* dependencies.repository.touch(
        session.id,
        now,
        slidingExpiry(session, dependencies.config, now),
      )
    }

    return actorFromSession(user, session)
  })

export const makeAuthenticate = (dependencies: SessionsDependencies) => {
  const fromCookie = makeAuthenticateCookie(dependencies)

  return Effect.fn(SPAN.auth.authenticate)(function* (credentials: Credentials) {
    if (credentials.bearerToken !== null) {
      return PATTERN.apiKeyFormat.test(credentials.bearerToken)
        ? yield* dependencies.apiKeys.authenticate(credentials.bearerToken)
        : yield* dependencies.universal.authenticate(credentials.bearerToken)
    }
    if (credentials.cookieToken !== null) return yield* fromCookie(credentials.cookieToken)
    return yield* new Unauthenticated({ reason: "missing" })
  })
}
