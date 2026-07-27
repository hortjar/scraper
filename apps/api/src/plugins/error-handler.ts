import { AppConfig } from "@scraper/core/config"
import type { ErrorCode } from "@scraper/core/constants"
import { ERROR_CODE, HEADER, HTTP_STATUS, LOG_FIELD, PLUGIN } from "@scraper/core/constants"
import type { HttpErrorBody } from "@scraper/core/errors"
import { MSG, resolveLocale, Translator } from "@scraper/core/i18n"
import { Effect } from "effect"
import { Elysia } from "elysia"

import type { AppRuntime } from "../runtime.js"

interface FrameworkFailure {
  readonly status: number
  readonly code: ErrorCode
  readonly messageKey: string
}

const FRAMEWORK_FAILURES: Record<string, FrameworkFailure> = {
  NOT_FOUND: {
    status: HTTP_STATUS.notFound,
    code: ERROR_CODE.notFound,
    messageKey: MSG.errors.notFound,
  },
  VALIDATION: {
    status: HTTP_STATUS.unprocessable,
    code: ERROR_CODE.validationFailed,
    messageKey: MSG.errors.validationFailed,
  },
  PARSE: {
    status: HTTP_STATUS.badRequest,
    code: ERROR_CODE.validationFailed,
    messageKey: MSG.errors.validationFailed,
  },
  INVALID_COOKIE_SIGNATURE: {
    status: HTTP_STATUS.unauthorized,
    code: ERROR_CODE.unauthenticated,
    messageKey: MSG.errors.unauthenticated,
  },
}

const UNHANDLED_LOG_MESSAGE = "http.unhandledError"

const stringifyUnknown = (value: unknown): string =>
  typeof value === "string" ? value : JSON.stringify(value)

const describeCause = (error: unknown): string => {
  if (!(error instanceof Error)) return stringifyUnknown(error)
  const cause = error.cause === undefined ? "" : ` cause=${stringifyUnknown(error.cause)}`
  return `${error.name}: ${error.message}${cause}`
}

const logUnhandled = (requestId: string, path: string, code: string | number, error: unknown) =>
  Effect.logError(UNHANDLED_LOG_MESSAGE).pipe(
    Effect.annotateLogs({
      [LOG_FIELD.requestId]: requestId,
      [LOG_FIELD.path]: path,
      [LOG_FIELD.errorTag]: String(code),
      [LOG_FIELD.cause]: describeCause(error),
    }),
  )

const INTERNAL: FrameworkFailure = {
  status: HTTP_STATUS.internalError,
  code: ERROR_CODE.internalError,
  messageKey: MSG.errors.internalError,
}

export const errorHandlerPlugin = (runtime: AppRuntime) =>
  new Elysia({ name: PLUGIN.errorHandler }).onError(
    { as: "global" },
    ({ code, error, set, request }): HttpErrorBody => {
      const failure = FRAMEWORK_FAILURES[code] ?? INTERNAL
      const acceptLanguage = request.headers.get(HEADER.acceptLanguage)
      const requestId =
        set.headers[HEADER.requestId] ??
        request.headers.get(HEADER.requestId) ??
        crypto.randomUUID()

      set.status = failure.status
      set.headers[HEADER.requestId] = requestId

      if (failure === INTERNAL) runtime.runSync(logUnhandled(requestId, request.url, code, error))

      const message = runtime.runSync(
        Effect.gen(function* () {
          const translator = yield* Translator
          const config = yield* AppConfig
          const locale = resolveLocale(null, acceptLanguage, config.app.defaultLocale)
          return translator.render(failure.messageKey, { requestId, path: request.url }, locale)
        }),
      )

      return {
        code: failure.code,
        messageKey: failure.messageKey,
        messageParams: { requestId },
        message,
        requestId,
      }
    },
  )
