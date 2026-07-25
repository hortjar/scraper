import { AppConfig } from "@scraper/core/config"
import { HEADER, PLUGIN } from "@scraper/core/constants"
import type { AppError, HttpErrorBody } from "@scraper/core/errors"
import { resolveLocale, Translator } from "@scraper/core/i18n"
import { toHttpFailure } from "@scraper/core/observability"
import { Effect } from "effect"
import { Elysia } from "elysia"

import type { AppRuntime, AppServices } from "../runtime.js"

export const effectPlugin = (runtime: AppRuntime) =>
  new Elysia({ name: PLUGIN.effect }).derive({ as: "global" }, ({ headers, set }) => {
    const runFx = <A, E extends AppError>(
      fx: Effect.Effect<A, E, AppServices>,
    ): Promise<A | HttpErrorBody> =>
      runtime.runPromise(
        fx.pipe(
          Effect.catchAll((error) =>
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
              const body: HttpErrorBody = {
                code: failure.code,
                messageKey: failure.messageKey,
                messageParams: failure.messageParams,
                message: translator.render(failure.messageKey, failure.messageParams, locale),
                requestId: String(set.headers[HEADER.requestId] ?? ""),
                ...(failure.issues ? { issues: failure.issues } : {}),
              }
              return body
            }),
          ),
        ),
      )

    return { runFx }
  })
