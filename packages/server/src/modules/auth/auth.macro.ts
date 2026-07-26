import { HEADER, PLUGIN, USER_ROLE } from "@scraper/core/constants"
import type { ApiKeyScope, UserRole } from "@scraper/core/domain"
import {
  ApiKeyNotAllowed,
  EmailNotVerified,
  type InsufficientScope,
  NotAuthorized,
} from "@scraper/core/errors"
import { Effect, Either } from "effect"
import { Elysia, status } from "elysia"

import { AUTH_HEADER, CREDENTIAL } from "./auth.constants.js"
import type { AuthPluginOptions } from "./auth.http.js"
import { makeRunAuthEither, readCookie } from "./auth.http.js"
import type { AuthActor } from "./auth.schema.js"
import { assertScope } from "./keys/api-keys.service.js"
import { bearerFrom } from "./sessions/authenticate.js"
import { Sessions } from "./sessions/sessions.service.js"

export interface RequireUserOptions {
  readonly sessionOnly?: boolean
  readonly scopes?: readonly ApiKeyScope[]
  readonly role?: UserRole
  readonly verifiedEmail?: boolean
  readonly action?: string
}

export type RequireUserInput = boolean | RequireUserOptions

const DEFAULT_ACTION = "authenticate"

export const normalizeRequireUser = (input: RequireUserInput): RequireUserOptions =>
  typeof input === "boolean" ? {} : input

export const assertAllowed = (
  actor: AuthActor,
  options: RequireUserOptions,
): Effect.Effect<void, ApiKeyNotAllowed | NotAuthorized | EmailNotVerified | InsufficientScope> =>
  Effect.gen(function* () {
    const action = options.action ?? DEFAULT_ACTION

    if (options.sessionOnly === true && actor.credential === CREDENTIAL.apiKey) {
      return yield* new ApiKeyNotAllowed({ action })
    }
    const scopes = options.scopes ?? []
    for (const scope of scopes) {
      yield* assertScope(actor, scope)
    }
    if (options.role === USER_ROLE.admin && actor.role !== USER_ROLE.admin) {
      return yield* new NotAuthorized({ action })
    }
    if (options.verifiedEmail === true && !actor.emailVerified) {
      return yield* new EmailNotVerified({ email: actor.email })
    }
  })

export const requireUser = ({ runtime, config }: AuthPluginOptions) =>
  new Elysia({ name: PLUGIN.requireUser }).macro({
    auth: (input: RequireUserInput) => ({
      resolve: async ({ headers, set }) => {
        const options = normalizeRequireUser(input)
        const credentials = {
          cookieToken: readCookie(headers[AUTH_HEADER.cookie], config.security.sessionCookieName),
          bearerToken: bearerFrom(headers[HEADER.authorization]),
        }

        const outcome = await makeRunAuthEither(
          runtime,
          headers,
          set,
        )(
          Effect.gen(function* () {
            const sessions = yield* Sessions
            const actor = yield* sessions.authenticate(credentials)
            yield* assertAllowed(actor, options)
            return actor
          }),
        )

        if (Either.isLeft(outcome)) {
          return status(outcome.left.status, outcome.left.body)
        }
        return { user: outcome.right }
      },
    }),
  })
