import { AppConfig } from "@scraper/core/config"
import { LOG_FIELD, SPAN } from "@scraper/core/constants"
import { Effect, Redacted } from "effect"

import { assertPasswordAcceptable } from "./passwords/password-policy.js"
import { isUniversalMode } from "./universal/universal.config.js"
import { Users } from "./users/users.service.js"

export const bootstrapAdmin: Effect.Effect<void, never, AppConfig | Users> = Effect.gen(
  function* () {
    const config = yield* AppConfig
    if (isUniversalMode(config)) return

    const email = config.auth.adminEmail
    const password = Redacted.value(config.auth.adminPassword)
    if (email === "" || password === "") return

    const users = yield* Users
    yield* assertPasswordAcceptable(config, password)
    const admin = yield* users.ensureAdmin(email, password)
    yield* Effect.logInfo(SPAN.auth.bootstrapAdmin).pipe(
      Effect.annotateLogs({ [LOG_FIELD.userId]: admin.id }),
    )
  },
).pipe(
  Effect.tapErrorCause((cause) => Effect.logError(SPAN.auth.bootstrapAdmin, cause)),
  Effect.ignore,
  Effect.withSpan(SPAN.auth.bootstrapAdmin),
)
