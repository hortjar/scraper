import { AppConfig } from "@scraper/core/config"
import { ACTOR_KIND, AUDIT_ACTION, SERVICE_TAG, SPAN } from "@scraper/core/constants"
import type { SessionId, UserId } from "@scraper/core/domain"
import { SessionNotFound } from "@scraper/core/errors"
import { Clock, Effect } from "effect"

import { AuditLog } from "../audit/audit-log.service.js"
import { AUDIT_SUBJECT, TOKEN_BYTES } from "../auth.constants.js"
import { randomUrlToken, sha256 } from "../auth.crypto.js"
import { toSessionDto } from "../auth.dto.js"
import type { AuthActor, IssuedSession, LoginBody, RequestContext } from "../auth.schema.js"
import { ApiKeys } from "../keys/api-keys.service.js"
import { UniversalAuth } from "../universal/universal.service.js"
import { UserRepository } from "../users/user.repository.js"
import { Users } from "../users/users.service.js"

import type { SessionsDependencies } from "./authenticate.js"
import { makeAuthenticate } from "./authenticate.js"
import { SessionRepository } from "./session.repository.js"

const MILLIS_PER_SECOND = 1000

export class Sessions extends Effect.Service<Sessions>()(SERVICE_TAG.Sessions, {
  effect: Effect.gen(function* () {
    const config = yield* AppConfig
    const repository = yield* SessionRepository
    const userRepository = yield* UserRepository
    const apiKeys = yield* ApiKeys
    const universal = yield* UniversalAuth
    const users = yield* Users
    const audit = yield* AuditLog

    const dependencies: SessionsDependencies = {
      config,
      repository,
      users: userRepository,
      apiKeys,
      universal,
    }

    const authenticate = makeAuthenticate(dependencies)

    const issue = Effect.fn(SPAN.auth.createSession)(function* (
      userId: UserId,
      context: RequestContext,
    ) {
      const nowMillis = yield* Clock.currentTimeMillis
      const token = yield* randomUrlToken(TOKEN_BYTES.session)
      const ttl = Math.min(
        config.security.sessionTtlSeconds,
        config.security.sessionAbsoluteTtlSeconds,
      )
      const expiresAt = new Date(nowMillis + ttl * MILLIS_PER_SECOND)
      const stored = yield* repository.insert({
        userId,
        tokenHash: sha256(token),
        expiresAt,
        userAgent: context.userAgent,
        ip: context.ip,
      })
      const issued: IssuedSession = { token, sessionId: stored.id, expiresAt }
      return issued
    })

    const login = Effect.fn(SPAN.auth.login)(function* (input: LoginBody, context: RequestContext) {
      const user = yield* users.verifyCredentials(input.email, input.password, context)
      const session = yield* issue(user.id, context)
      yield* audit.record({
        userId: user.id,
        actorKind: ACTOR_KIND.user,
        action: AUDIT_ACTION.userLoggedIn,
        subjectKind: AUDIT_SUBJECT.session,
        subjectId: session.sessionId,
        meta: {},
        ip: context.ip,
      })
      return { user, session }
    })

    const list = Effect.fn(SPAN.auth.listSessions)(function* (
      userId: UserId,
      current: SessionId | null,
    ) {
      const now = new Date(yield* Clock.currentTimeMillis)
      const rows = yield* repository.listActive(userId, now)
      return rows.map((row) => toSessionDto(row, current))
    })

    const revoke = Effect.fn(SPAN.auth.revokeSession)(function* (
      userId: UserId,
      sessionId: SessionId,
      context: RequestContext,
    ) {
      const now = new Date(yield* Clock.currentTimeMillis)
      const isRevoked = yield* repository.revoke(userId, sessionId, now)
      if (!isRevoked) return yield* new SessionNotFound({ id: sessionId })
      yield* audit.record({
        userId,
        actorKind: ACTOR_KIND.user,
        action: AUDIT_ACTION.sessionRevoked,
        subjectKind: AUDIT_SUBJECT.session,
        subjectId: sessionId,
        meta: {},
        ip: context.ip,
      })
    })

    const revokeAll = Effect.fn(SPAN.auth.revokeAllSessions)(function* (
      userId: UserId,
      context: RequestContext,
      except: SessionId | null,
    ) {
      const now = new Date(yield* Clock.currentTimeMillis)
      const count = yield* repository.revokeAll(userId, now, except)
      yield* audit.record({
        userId,
        actorKind: ACTOR_KIND.user,
        action: AUDIT_ACTION.sessionsRevokedAll,
        subjectKind: AUDIT_SUBJECT.user,
        subjectId: userId,
        meta: { count },
        ip: context.ip,
      })
      return count
    })

    const logout = Effect.fn(SPAN.auth.logout)(function* (
      actor: AuthActor,
      context: RequestContext,
    ) {
      if (actor.sessionId === null) return
      const now = new Date(yield* Clock.currentTimeMillis)
      yield* repository.revoke(actor.userId, actor.sessionId, now)
      yield* audit.record({
        userId: actor.userId,
        actorKind: ACTOR_KIND.user,
        action: AUDIT_ACTION.userLoggedOut,
        subjectKind: AUDIT_SUBJECT.session,
        subjectId: actor.sessionId,
        meta: {},
        ip: context.ip,
      })
    })

    return { authenticate, issue, login, list, revoke, revokeAll, logout } as const
  }),
  dependencies: [
    AppConfig.Default,
    SessionRepository.Default,
    UserRepository.Default,
    ApiKeys.Default,
    UniversalAuth.Default,
    Users.Default,
    AuditLog.Default,
  ],
}) {}
