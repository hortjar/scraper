import { ACTOR_KIND, AUDIT_ACTION, LOG_FIELD, SPAN, TOKEN_PURPOSE } from "@scraper/core/constants"
import type { UserId } from "@scraper/core/domain"
import { TokenInvalid } from "@scraper/core/errors"
import type { SupportedLocale } from "@scraper/core/i18n"
import { fallbackLocale, isSupportedLocale, MSG } from "@scraper/core/i18n"
import { Clock, Effect } from "effect"

import {
  AUDIT_SUBJECT,
  TOKEN_BYTES,
  TOKEN_QUERY_PARAMETER,
  TOKEN_TTL_SECONDS,
  WEB_PATH,
} from "../auth.constants.js"
import { randomUrlToken, sha256 } from "../auth.crypto.js"
import type { RequestContext } from "../auth.schema.js"

import type { UserRecord } from "./user.repository.js"
import type { UsersDependencies } from "./users.dependencies.js"

const MILLIS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60

export const localeOf = (user: UserRecord): SupportedLocale =>
  isSupportedLocale(user.locale) ? user.locale : fallbackLocale

export const buildLink = (appUrl: string, path: string, token: string): string => {
  const url = new URL(path, appUrl)
  url.searchParams.set(TOKEN_QUERY_PARAMETER, token)
  return url.href
}

export const minutesOf = (seconds: number): number => Math.round(seconds / SECONDS_PER_MINUTE)

export const logAndSwallow = <A, E, R>(
  span: string,
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<void, never, R> =>
  effect.pipe(
    Effect.tapErrorCause((cause) =>
      Effect.logError(span, cause).pipe(Effect.annotateLogs({ [LOG_FIELD.errorTag]: span })),
    ),
    Effect.ignore,
  )

export const issueToken = (
  dependencies: UsersDependencies,
  userId: UserId,
  purpose: "email_verify" | "password_reset",
  ttlSeconds: number,
) =>
  Effect.gen(function* () {
    const nowMillis = yield* Clock.currentTimeMillis
    const raw = yield* randomUrlToken(TOKEN_BYTES.verification)
    yield* dependencies.tokens.consumeOutstanding(userId, purpose, new Date(nowMillis))
    yield* dependencies.tokens.insert({
      userId,
      purpose,
      tokenHash: sha256(raw),
      expiresAt: new Date(nowMillis + ttlSeconds * MILLIS_PER_SECOND),
    })
    return raw
  })

export const sendEmailVerification = (dependencies: UsersDependencies, user: UserRecord) =>
  logAndSwallow(
    SPAN.auth.requestEmailVerification,
    issueToken(
      dependencies,
      user.id,
      TOKEN_PURPOSE.emailVerify,
      TOKEN_TTL_SECONDS.emailVerify,
    ).pipe(
      Effect.flatMap((raw) =>
        dependencies.mailer.send({
          to: user.email,
          locale: localeOf(user),
          subjectKey: MSG.emails.verifySubject,
          bodyKey: MSG.emails.verifyBody,
          params: { minutes: minutesOf(TOKEN_TTL_SECONDS.emailVerify) },
          link: buildLink(dependencies.config.app.appUrl, WEB_PATH.verifyEmail, raw),
        }),
      ),
    ),
  )

export const makeRequestEmailVerification = (dependencies: UsersDependencies) =>
  Effect.fn(SPAN.auth.requestEmailVerification)(function* (userId: UserId) {
    const user = yield* dependencies.repository.findById(userId)
    if (user?.emailVerifiedAt !== null) return
    yield* sendEmailVerification(dependencies, user)
  })

export const makeVerifyEmail = (dependencies: UsersDependencies) =>
  Effect.fn(SPAN.auth.verifyEmail)(function* (token: string, context: RequestContext) {
    const now = new Date(yield* Clock.currentTimeMillis)
    const stored = yield* dependencies.tokens.findByHash(sha256(token))

    if (
      stored?.purpose !== TOKEN_PURPOSE.emailVerify ||
      stored.consumedAt !== null ||
      stored.expiresAt <= now
    ) {
      return yield* new TokenInvalid({ purpose: TOKEN_PURPOSE.emailVerify })
    }

    const isConsumed = yield* dependencies.tokens.consume(stored.id, now)
    if (!isConsumed) return yield* new TokenInvalid({ purpose: TOKEN_PURPOSE.emailVerify })

    yield* dependencies.repository.markEmailVerified(stored.userId, now)
    yield* dependencies.audit.record({
      userId: stored.userId,
      actorKind: ACTOR_KIND.user,
      action: AUDIT_ACTION.userEmailVerified,
      subjectKind: AUDIT_SUBJECT.user,
      subjectId: stored.userId,
      meta: {},
      ip: context.ip,
    })
  })
