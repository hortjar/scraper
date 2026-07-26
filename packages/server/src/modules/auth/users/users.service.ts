import { AppConfig } from "@scraper/core/config"
import { ACTOR_KIND, AUDIT_ACTION, SERVICE_TAG, SPAN, USER_ROLE } from "@scraper/core/constants"
import type { Email, UserId } from "@scraper/core/domain"
import { LocalAuthDisabled, RegistrationClosed, UserNotFound } from "@scraper/core/errors"
import { Clock, Effect } from "effect"

import { AuditLog } from "../audit/audit-log.service.js"
import { AUDIT_SUBJECT, AUTH_OPERATION, DEFAULT_TIMEZONE, UNKNOWN_IP } from "../auth.constants.js"
import { AuthMailer } from "../auth.mailer.js"
import { AuthRateLimiter } from "../auth.rate-limit.js"
import type { RegisterBody, RequestContext, UpdateProfileBody } from "../auth.schema.js"
import { normalizeEmail } from "../auth.schema.js"
import { PasswordHasher } from "../passwords/password-hasher.js"
import { assertPasswordAcceptable } from "../passwords/password-policy.js"
import { SessionRepository } from "../sessions/session.repository.js"
import { VerificationTokenRepository } from "../tokens/verification-token.repository.js"
import { isUniversalMode } from "../universal/universal.config.js"

import {
  makeChangePassword,
  makeRequestPasswordReset,
  makeResetPassword,
  makeVerifyCredentials,
} from "./password-flows.js"
import { planLimitsFrom } from "./plan-limits.js"
import { UserRepository } from "./user.repository.js"
import type { UsersDependencies } from "./users.dependencies.js"
import {
  makeRequestEmailVerification,
  makeVerifyEmail,
  sendEmailVerification,
} from "./verification-flows.js"

export class Users extends Effect.Service<Users>()(SERVICE_TAG.Users, {
  effect: Effect.gen(function* () {
    const config = yield* AppConfig
    const repository = yield* UserRepository
    const sessions = yield* SessionRepository
    const tokens = yield* VerificationTokenRepository
    const hasher = yield* PasswordHasher
    const audit = yield* AuditLog
    const mailer = yield* AuthMailer
    const limiter = yield* AuthRateLimiter

    const dependencies: UsersDependencies = {
      config,
      repository,
      sessions,
      tokens,
      hasher,
      audit,
      mailer,
      limiter,
    }

    const register = Effect.fn(SPAN.auth.register)(function* (
      input: RegisterBody,
      context: RequestContext,
    ) {
      if (isUniversalMode(config)) {
        return yield* new LocalAuthDisabled({ operation: AUTH_OPERATION.register })
      }
      if (!config.http.enableRegistration) return yield* new RegistrationClosed({})

      yield* limiter.register(context.ip ?? UNKNOWN_IP)
      const email = yield* normalizeEmail(input.email)
      yield* assertPasswordAcceptable(config, input.password)

      const passwordHash = yield* hasher.hash(input.password)
      const user = yield* repository.insert({
        email,
        passwordHash,
        displayName: input.displayName ?? null,
        timezone: DEFAULT_TIMEZONE,
        locale: config.app.defaultLocale,
        role: USER_ROLE.user,
        planLimits: planLimitsFrom(config),
      })

      yield* audit.record({
        userId: user.id,
        actorKind: ACTOR_KIND.user,
        action: AUDIT_ACTION.userRegistered,
        subjectKind: AUDIT_SUBJECT.user,
        subjectId: user.id,
        meta: {},
        ip: context.ip,
      })

      yield* sendEmailVerification(dependencies, user)
      return user
    })

    const findById = Effect.fn(SPAN.auth.findUser)(function* (userId: UserId) {
      const user = yield* repository.findById(userId)
      if (user === null) return yield* new UserNotFound({ id: userId })
      return user
    })

    const updateProfile = Effect.fn(SPAN.auth.updateProfile)(function* (
      userId: UserId,
      patch: UpdateProfileBody,
    ) {
      const now = new Date(yield* Clock.currentTimeMillis)
      const updated = yield* repository.updateProfile(userId, patch, now)
      if (updated === null) return yield* new UserNotFound({ id: userId })
      return updated
    })

    const ensureAdmin = Effect.fn(SPAN.auth.bootstrapAdmin)(function* (
      rawEmail: string,
      password: string,
    ) {
      const email: Email = yield* normalizeEmail(rawEmail)
      const existing = yield* repository.findByEmail(email)
      if (existing !== null) return existing

      const now = new Date(yield* Clock.currentTimeMillis)
      const passwordHash = yield* hasher.hash(password)
      const created = yield* repository.insert({
        email,
        passwordHash,
        displayName: null,
        timezone: DEFAULT_TIMEZONE,
        locale: config.app.defaultLocale,
        role: USER_ROLE.admin,
        planLimits: planLimitsFrom(config),
      })
      yield* repository.markEmailVerified(created.id, now)
      return created
    })

    return {
      register,
      findById,
      updateProfile,
      ensureAdmin,
      verifyCredentials: makeVerifyCredentials(dependencies),
      changePassword: makeChangePassword(dependencies),
      requestPasswordReset: makeRequestPasswordReset(dependencies),
      resetPassword: makeResetPassword(dependencies),
      requestEmailVerification: makeRequestEmailVerification(dependencies),
      verifyEmail: makeVerifyEmail(dependencies),
    } as const
  }),
  dependencies: [
    AppConfig.Default,
    UserRepository.Default,
    SessionRepository.Default,
    VerificationTokenRepository.Default,
    PasswordHasher.Default,
    AuditLog.Default,
    AuthMailer.Default,
    AuthRateLimiter.Default,
  ],
}) {}
