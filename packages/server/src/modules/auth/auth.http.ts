import type { RootConfig } from "@scraper/core/config"
import { AppConfig, blankToUndefined } from "@scraper/core/config"
import { APP_ENV, HEADER, HTTP_STATUS, LOG_FIELD } from "@scraper/core/constants"
import type { AppError, HttpErrorBody } from "@scraper/core/errors"
import { resolveLocale, Translator } from "@scraper/core/i18n"
import { toHttpFailure } from "@scraper/core/observability"
import { Effect, Either, type ManagedRuntime } from "effect"
import { Elysia } from "elysia"

import { AUTH_HEADER, COOKIE_ATTRIBUTE, COOKIE_SEPARATOR, UNKNOWN_IP } from "./auth.constants.js"
import type { IssuedSession, RequestContext } from "./auth.schema.js"
import type { ApiKeys } from "./keys/api-keys.service.js"
import type { Sessions } from "./sessions/sessions.service.js"
import type { Users } from "./users/users.service.js"

export type AuthServices = AppConfig | Translator | Users | Sessions | ApiKeys

export type AuthRuntime<R = never> = ManagedRuntime.ManagedRuntime<R | AuthServices, unknown>

export interface AuthPluginOptions<R = never> {
  readonly runtime: AuthRuntime<R>
  readonly config: RootConfig
}

export interface AuthFailureResponse {
  readonly status: number
  readonly body: HttpErrorBody
}

export type RunAuthFx<R = never> = <A, E extends AppError>(
  effect: Effect.Effect<A, E, R | AuthServices>,
) => Promise<A | HttpErrorBody>

export type RunAuthEither<R = never> = <A, E extends AppError>(
  effect: Effect.Effect<A, E, R | AuthServices>,
) => Promise<Either.Either<A, AuthFailureResponse>>

const COOKIE_PAIR_SEPARATOR = ";"
const COOKIE_ASSIGNMENT = "="
const MILLIS_PER_SECOND = 1000
const EXPIRED_MAX_AGE = 0
const MAX_AGE_ATTRIBUTE = "Max-Age"

export const readCookie = (header: string | null | undefined, name: string): string | null => {
  const cookies = blankToUndefined(header)
  if (cookies === undefined) return null
  for (const part of cookies.split(COOKIE_PAIR_SEPARATOR)) {
    const index = part.indexOf(COOKIE_ASSIGNMENT)
    if (index < 1) continue
    if (part.slice(0, index).trim() !== name) continue
    return decodeURIComponent(part.slice(index + 1).trim())
  }
  return null
}

export const buildSessionCookie = (
  config: RootConfig,
  value: string,
  maxAgeSeconds: number,
): string =>
  [
    `${config.security.sessionCookieName}${COOKIE_ASSIGNMENT}${encodeURIComponent(value)}`,
    COOKIE_ATTRIBUTE.path,
    COOKIE_ATTRIBUTE.httpOnly,
    COOKIE_ATTRIBUTE.sameSite,
    `${MAX_AGE_ATTRIBUTE}${COOKIE_ASSIGNMENT}${String(maxAgeSeconds)}`,
    ...(config.app.env === APP_ENV.development ? [] : [COOKIE_ATTRIBUTE.secure]),
  ].join(COOKIE_SEPARATOR)

export const sessionCookieFor = (config: RootConfig, issued: IssuedSession, now: Date): string => {
  const remainingSeconds = (issued.expiresAt.getTime() - now.getTime()) / MILLIS_PER_SECOND
  return buildSessionCookie(config, issued.token, Math.max(1, Math.floor(remainingSeconds)))
}

export const clearedSessionCookie = (config: RootConfig): string =>
  buildSessionCookie(config, "", EXPIRED_MAX_AGE)

export const requestContextFrom = (
  headers: Readonly<Record<string, string | undefined>>,
  shouldTrustProxy: boolean,
): RequestContext => {
  const forwarded = shouldTrustProxy ? headers[AUTH_HEADER.forwardedFor] : undefined
  const ip = forwarded?.split(",", 1)[0]?.trim()
  return {
    ip: ip === undefined || ip === "" ? UNKNOWN_IP : ip,
    userAgent: headers[HEADER.userAgent] ?? null,
  }
}

export interface ResponseSink {
  status?: number | string | undefined
  headers: Record<string, string | number | undefined>
}

const SERVER_FAILURE_LOG = "http.serverFailure"

const asText = (value: unknown): string =>
  typeof value === "string" ? value : JSON.stringify(value)

const DESCRIBED_FIELDS = ["cause", "entity", "detail", "operation", "reason"] as const

const describeAppError = (error: AppError): string => {
  const record = error as unknown as Readonly<Record<string, unknown>>
  const parts = DESCRIBED_FIELDS.filter(
    (field) => record[field] !== undefined && record[field] !== null,
  ).map((field) => `${field}=${asText(record[field])}`)
  return parts.length === 0 ? error._tag : `${error._tag} ${parts.join(" ")}`
}

const failureResponse = (
  error: AppError,
  headers: Readonly<Record<string, string | undefined>>,
  set: ResponseSink,
): Effect.Effect<AuthFailureResponse, never, Translator | AppConfig> =>
  Effect.gen(function* () {
    const translator = yield* Translator
    const config = yield* AppConfig
    const failure = toHttpFailure(error)
    const locale = resolveLocale(
      null,
      headers[HEADER.acceptLanguage] ?? null,
      config.app.defaultLocale,
    )
    set.status = failure.status
    if (failure.retryAfterSeconds !== undefined) {
      set.headers[HEADER.retryAfter] = String(failure.retryAfterSeconds)
    }
    const requestId = String(set.headers[HEADER.requestId] ?? "")
    const messageParameters = { ...failure.messageParams, requestId }

    if (failure.status >= HTTP_STATUS.internalError) {
      yield* Effect.logError(SERVER_FAILURE_LOG).pipe(
        Effect.annotateLogs({
          [LOG_FIELD.requestId]: requestId,
          [LOG_FIELD.errorTag]: error._tag,
          [LOG_FIELD.cause]: describeAppError(error),
        }),
      )
    }

    const body: HttpErrorBody = {
      code: failure.code,
      messageKey: failure.messageKey,
      messageParams: messageParameters,
      message: translator.render(failure.messageKey, messageParameters, locale),
      requestId,
      ...(failure.issues && { issues: failure.issues }),
    }
    return { status: failure.status, body }
  })

export const makeRunAuthEither =
  <R>(
    runtime: AuthRuntime<R>,
    headers: Readonly<Record<string, string | undefined>>,
    set: ResponseSink,
  ): RunAuthEither<R> =>
  <A, E extends AppError>(effect: Effect.Effect<A, E, R | AuthServices>) =>
    runtime.runPromise(
      effect.pipe(
        Effect.map((value): Either.Either<A, AuthFailureResponse> => Either.right(value)),
        Effect.catchAll((error: AppError) =>
          failureResponse(error, headers, set).pipe(
            Effect.map((response): Either.Either<A, AuthFailureResponse> => Either.left(response)),
          ),
        ),
      ),
    )

export const makeRunAuthFx = <R>(
  runtime: AuthRuntime<R>,
  headers: Readonly<Record<string, string | undefined>>,
  set: ResponseSink,
): RunAuthFx<R> => {
  const runEither = makeRunAuthEither<R>(runtime, headers, set)
  return async (effect) => {
    const outcome = await runEither(effect)
    return Either.isRight(outcome) ? outcome.right : outcome.left.body
  }
}

export const authBase = <R>({ runtime, config }: AuthPluginOptions<R>, name: string) =>
  new Elysia({ name }).derive({ as: "scoped" }, ({ headers, set }) => ({
    runAuthFx: makeRunAuthFx<R>(runtime, headers, set),
    requestContext: requestContextFrom(headers, config.http.trustProxy),
  }))
