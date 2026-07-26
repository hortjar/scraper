import { ACTOR_KIND, AUDIT_ACTION, PATTERN, SERVICE_TAG, SPAN } from "@scraper/core/constants"
import type { ApiKeyId, ApiKeyScope, UserId } from "@scraper/core/domain"
import { ApiKeyNotFound, InsufficientScope, Unauthenticated } from "@scraper/core/errors"
import { Clock, Effect } from "effect"

import { AuditLog } from "../audit/audit-log.service.js"
import { API_KEY, AUDIT_SUBJECT, CREDENTIAL, TOKEN_BYTES } from "../auth.constants.js"
import { randomAlphanumeric, randomUrlToken, sha256 } from "../auth.crypto.js"
import { toApiKeyDto } from "../auth.dto.js"
import type {
  AuthActor,
  CreateApiKeyBody,
  CreatedApiKeyDto,
  RequestContext,
} from "../auth.schema.js"
import { UserRepository } from "../users/user.repository.js"

import { ApiKeyRepository } from "./api-key.repository.js"

export interface ParsedApiKey {
  readonly prefix: string
  readonly raw: string
}

export const parseApiKey = (raw: string): ParsedApiKey | null => {
  if (!PATTERN.apiKeyFormat.test(raw)) return null
  const parts = raw.split(API_KEY.separator)
  if (parts.length !== API_KEY.segments) return null
  const [, prefix] = parts
  return prefix === undefined ? null : { prefix, raw }
}

export const formatApiKey = (prefix: string, secret: string): string =>
  [API_KEY.prefix, prefix, secret].join(API_KEY.separator)

export const assertScope = (
  actor: AuthActor,
  required: ApiKeyScope,
): Effect.Effect<void, InsufficientScope> =>
  actor.credential !== CREDENTIAL.apiKey || actor.scopes.includes(required)
    ? Effect.void
    : Effect.fail(new InsufficientScope({ required }))

export class ApiKeys extends Effect.Service<ApiKeys>()(SERVICE_TAG.ApiKeys, {
  effect: Effect.gen(function* () {
    const repository = yield* ApiKeyRepository
    const users = yield* UserRepository
    const audit = yield* AuditLog

    const create = Effect.fn(SPAN.auth.createApiKey)(function* (
      userId: UserId,
      input: CreateApiKeyBody,
      context: RequestContext,
    ) {
      const prefix = yield* randomAlphanumeric(TOKEN_BYTES.apiKeyPrefix).pipe(
        Effect.map((value) => value.slice(0, API_KEY.prefixLength)),
      )
      const secret = yield* randomUrlToken(TOKEN_BYTES.apiKeySecret)
      const raw = formatApiKey(prefix, secret)

      const stored = yield* repository.insert({
        userId,
        name: input.name,
        prefix,
        keyHash: sha256(raw),
        scopes: input.scopes,
        expiresAt: input.expiresAt === undefined ? null : new Date(input.expiresAt),
      })

      yield* audit.record({
        userId,
        actorKind: ACTOR_KIND.user,
        action: AUDIT_ACTION.apiKeyCreated,
        subjectKind: AUDIT_SUBJECT.apiKey,
        subjectId: stored.id,
        meta: { scopes: stored.scopes },
        ip: context.ip,
      })

      const created: CreatedApiKeyDto = { ...toApiKeyDto(stored), key: raw }
      return created
    })

    const list = Effect.fn(SPAN.auth.listApiKeys)(function* (userId: UserId) {
      const rows = yield* repository.listActive(userId)
      return rows.map((row) => toApiKeyDto(row))
    })

    const revoke = Effect.fn(SPAN.auth.revokeApiKey)(function* (
      userId: UserId,
      id: ApiKeyId,
      context: RequestContext,
    ) {
      const now = new Date(yield* Clock.currentTimeMillis)
      const isRevoked = yield* repository.revoke(userId, id, now)
      if (!isRevoked) return yield* new ApiKeyNotFound({ id })
      yield* audit.record({
        userId,
        actorKind: ACTOR_KIND.user,
        action: AUDIT_ACTION.apiKeyRevoked,
        subjectKind: AUDIT_SUBJECT.apiKey,
        subjectId: id,
        meta: {},
        ip: context.ip,
      })
    })

    const authenticate = Effect.fn(SPAN.auth.verifyApiKey)(function* (raw: string) {
      const parsed = parseApiKey(raw)
      if (parsed === null) return yield* new Unauthenticated({ reason: "invalid" })

      const stored = yield* repository.findByHash(sha256(parsed.raw))
      if (stored === null) return yield* new Unauthenticated({ reason: "invalid" })
      if (stored.revokedAt !== null) return yield* new Unauthenticated({ reason: "revoked" })

      const now = new Date(yield* Clock.currentTimeMillis)
      if (stored.expiresAt !== null && stored.expiresAt <= now) {
        return yield* new Unauthenticated({ reason: "expired" })
      }

      const user = yield* users.findById(stored.userId)
      if (user === null) return yield* new Unauthenticated({ reason: "revoked" })

      yield* repository.touchLastUsed(stored.id, now)

      const actor: AuthActor = {
        userId: user.id,
        role: user.role,
        locale: user.locale,
        timezone: user.timezone,
        email: user.email,
        emailVerified: user.emailVerifiedAt !== null,
        scopes: stored.scopes,
        credential: CREDENTIAL.apiKey,
        sessionId: null,
        apiKeyId: stored.id,
      }
      return actor
    })

    return { create, list, revoke, authenticate } as const
  }),
  dependencies: [ApiKeyRepository.Default, UserRepository.Default, AuditLog.Default],
}) {}
