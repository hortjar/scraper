import { ACTOR_KIND, AUDIT_ACTION, SPAN, TOKEN_PURPOSE } from "@scraper/core/constants"
import type { Email, UserId } from "@scraper/core/domain"
import { InvalidCredentials, LocalAuthDisabled, TokenInvalid } from "@scraper/core/errors"
import { MSG } from "@scraper/core/i18n"
import { Clock, Effect } from "effect"

import {
  AUDIT_SUBJECT,
  AUTH_OPERATION,
  TOKEN_TTL_SECONDS,
  UNKNOWN_IP,
  WEB_PATH,
} from "../auth.constants.js"
import { sha256 } from "../auth.crypto.js"
import type { ChangePasswordBody, RequestContext } from "../auth.schema.js"
import { normalizeEmail } from "../auth.schema.js"
import { assertPasswordAcceptable } from "../passwords/password-policy.js"
import { isUniversalMode } from "../universal/universal.config.js"

import type { UserRecord } from "./user.repository.js"
import type { UsersDependencies } from "./users.dependencies.js"
import { buildLink, issueToken, localeOf, logAndSwallow, minutesOf } from "./verification-flows.js"

export const makeVerifyCredentials = (dependencies: UsersDependencies) =>
  Effect.fn(SPAN.auth.login)(function* (
    rawEmail: string,
    password: string,
    context: RequestContext,
  ) {
    if (isUniversalMode(dependencies.config)) {
      return yield* new LocalAuthDisabled({ operation: AUTH_OPERATION.passwordLogin })
    }

    const email = yield* normalizeEmail(rawEmail)
    yield* dependencies.limiter.login(context.ip ?? UNKNOWN_IP, email)

    const user = yield* dependencies.repository.findByEmail(email)
    if (user === null) {
      yield* dependencies.hasher.equalizeTiming
      yield* dependencies.audit.record({
        userId: null,
        actorKind: ACTOR_KIND.user,
        action: AUDIT_ACTION.userLoginFailed,
        subjectKind: AUDIT_SUBJECT.user,
        subjectId: null,
        meta: {},
        ip: context.ip,
      })
      return yield* new InvalidCredentials({})
    }

    const isMatches = yield* dependencies.hasher.verify(user.passwordHash, password)
    if (!isMatches) {
      yield* dependencies.audit.record({
        userId: user.id,
        actorKind: ACTOR_KIND.user,
        action: AUDIT_ACTION.userLoginFailed,
        subjectKind: AUDIT_SUBJECT.user,
        subjectId: user.id,
        meta: {},
        ip: context.ip,
      })
      return yield* new InvalidCredentials({})
    }

    if (dependencies.hasher.shouldRehash(user.passwordHash)) {
      const now = new Date(yield* Clock.currentTimeMillis)
      const rehashed = yield* dependencies.hasher.hash(password)
      yield* dependencies.repository.updatePasswordHash(user.id, rehashed, now)
    }

    return user
  })

export const makeChangePassword = (dependencies: UsersDependencies) =>
  Effect.fn(SPAN.auth.changePassword)(function* (
    userId: UserId,
    body: ChangePasswordBody,
    context: RequestContext,
  ) {
    if (isUniversalMode(dependencies.config)) {
      return yield* new LocalAuthDisabled({ operation: AUTH_OPERATION.passwordChange })
    }

    const user = yield* dependencies.repository.findById(userId)
    if (user === null) return yield* new InvalidCredentials({})

    const isMatches = yield* dependencies.hasher.verify(user.passwordHash, body.currentPassword)
    if (!isMatches) return yield* new InvalidCredentials({})

    yield* assertPasswordAcceptable(dependencies.config, body.newPassword)
    const now = new Date(yield* Clock.currentTimeMillis)
    const hashed = yield* dependencies.hasher.hash(body.newPassword)
    yield* dependencies.repository.updatePasswordHash(user.id, hashed, now)

    yield* dependencies.audit.record({
      userId: user.id,
      actorKind: ACTOR_KIND.user,
      action: AUDIT_ACTION.userPasswordChanged,
      subjectKind: AUDIT_SUBJECT.user,
      subjectId: user.id,
      meta: {},
      ip: context.ip,
    })
  })

const sendResetMail = (dependencies: UsersDependencies, user: UserRecord) =>
  logAndSwallow(
    SPAN.auth.requestPasswordReset,
    issueToken(
      dependencies,
      user.id,
      TOKEN_PURPOSE.passwordReset,
      TOKEN_TTL_SECONDS.passwordReset,
    ).pipe(
      Effect.flatMap((raw) =>
        dependencies.mailer.send({
          to: user.email,
          locale: localeOf(user),
          subjectKey: MSG.emails.resetSubject,
          bodyKey: MSG.emails.resetBody,
          params: { minutes: minutesOf(TOKEN_TTL_SECONDS.passwordReset) },
          link: buildLink(dependencies.config.app.appUrl, WEB_PATH.resetPassword, raw),
        }),
      ),
    ),
  )

export const makeRequestPasswordReset = (dependencies: UsersDependencies) =>
  Effect.fn(SPAN.auth.requestPasswordReset)(function* (rawEmail: string, context: RequestContext) {
    if (isUniversalMode(dependencies.config)) {
      return yield* new LocalAuthDisabled({ operation: AUTH_OPERATION.passwordReset })
    }

    const email: Email = yield* normalizeEmail(rawEmail)
    yield* dependencies.limiter.passwordReset(context.ip ?? UNKNOWN_IP, email)

    const user = yield* dependencies.repository.findByEmail(email)
    if (user === null) return
    yield* sendResetMail(dependencies, user)
  })

export const makeResetPassword = (dependencies: UsersDependencies) =>
  Effect.fn(SPAN.auth.resetPassword)(function* (
    token: string,
    password: string,
    context: RequestContext,
  ) {
    if (isUniversalMode(dependencies.config)) {
      return yield* new LocalAuthDisabled({ operation: AUTH_OPERATION.passwordReset })
    }

    const now = new Date(yield* Clock.currentTimeMillis)
    const stored = yield* dependencies.tokens.findByHash(sha256(token))

    if (
      stored?.purpose !== TOKEN_PURPOSE.passwordReset ||
      stored.consumedAt !== null ||
      stored.expiresAt <= now
    ) {
      return yield* new TokenInvalid({ purpose: TOKEN_PURPOSE.passwordReset })
    }

    yield* assertPasswordAcceptable(dependencies.config, password)

    const isConsumed = yield* dependencies.tokens.consume(stored.id, now)
    if (!isConsumed) return yield* new TokenInvalid({ purpose: TOKEN_PURPOSE.passwordReset })

    const hashed = yield* dependencies.hasher.hash(password)
    yield* dependencies.repository.updatePasswordHash(stored.userId, hashed, now)
    yield* dependencies.sessions.revokeAll(stored.userId, now, null)

    yield* dependencies.audit.record({
      userId: stored.userId,
      actorKind: ACTOR_KIND.user,
      action: AUDIT_ACTION.userPasswordReset,
      subjectKind: AUDIT_SUBJECT.user,
      subjectId: stored.userId,
      meta: {},
      ip: context.ip,
    })
  })
