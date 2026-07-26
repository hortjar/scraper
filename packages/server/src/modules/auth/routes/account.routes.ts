import { API_TAG, HTTP_STATUS } from "@scraper/core/constants"
import { Clock, Effect, Schema } from "effect"

import { AUTH_HEADER, AUTH_OPERATION_ID, AUTH_PATH } from "../auth.constants.js"
import { toUserDto } from "../auth.dto.js"
import type { AuthPluginOptions } from "../auth.http.js"
import { authBase, clearedSessionCookie, sessionCookieFor } from "../auth.http.js"
import { requireUser } from "../auth.macro.js"
import { LoginBody, RegisterBody, UpdateProfileBody, VerifyEmailBody } from "../auth.schema.js"
import { Sessions } from "../sessions/sessions.service.js"
import { Users } from "../users/users.service.js"

import {
  ACCEPTED_BODY,
  FAILURES,
  standardAccepted,
  standardNoContent,
  standardUser,
} from "./auth.responses.js"

const standardRegisterBody = Schema.standardSchemaV1(RegisterBody)
const standardLoginBody = Schema.standardSchemaV1(LoginBody)
const standardUpdateProfileBody = Schema.standardSchemaV1(UpdateProfileBody)
const standardVerifyEmailBody = Schema.standardSchemaV1(VerifyEmailBody)

export const accountRoutes = (options: AuthPluginOptions, pluginName: string) =>
  authBase(options, pluginName)
    .use(requireUser(options))
    .post(
      AUTH_PATH.register,
      ({ runAuthFx, requestContext, body, set }) => {
        set.status = HTTP_STATUS.created
        return runAuthFx(
          Effect.flatMap(Users, (users) =>
            users.register(body, requestContext).pipe(Effect.map(toUserDto)),
          ),
        )
      },
      {
        body: standardRegisterBody,
        response: { ...FAILURES, [HTTP_STATUS.created]: standardUser },
        detail: {
          summary: "Create an account",
          operationId: AUTH_OPERATION_ID.register,
          tags: [API_TAG.auth],
        },
      },
    )
    .post(
      AUTH_PATH.login,
      ({ runAuthFx, requestContext, body, set }) =>
        runAuthFx(
          Effect.gen(function* () {
            const sessions = yield* Sessions
            const now = new Date(yield* Clock.currentTimeMillis)
            const result = yield* sessions.login(body, requestContext)
            set.headers[AUTH_HEADER.setCookie] = sessionCookieFor(
              options.config,
              result.session,
              now,
            )
            return toUserDto(result.user)
          }),
        ),
      {
        body: standardLoginBody,
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardUser },
        detail: {
          summary: "Sign in with email and password",
          operationId: AUTH_OPERATION_ID.login,
          tags: [API_TAG.auth],
        },
      },
    )
    .post(
      AUTH_PATH.logout,
      ({ runAuthFx, requestContext, user, set }) => {
        set.status = HTTP_STATUS.noContent
        set.headers[AUTH_HEADER.setCookie] = clearedSessionCookie(options.config)
        return runAuthFx(
          Effect.flatMap(Sessions, (sessions) =>
            sessions.logout(user, requestContext).pipe(Effect.as(null)),
          ),
        )
      },
      {
        auth: true,
        response: { ...FAILURES, [HTTP_STATUS.noContent]: standardNoContent },
        detail: {
          summary: "Sign out of the current session",
          operationId: AUTH_OPERATION_ID.logout,
          tags: [API_TAG.auth],
        },
      },
    )
    .get(
      AUTH_PATH.me,
      ({ runAuthFx, user }) =>
        runAuthFx(
          Effect.flatMap(Users, (users) => users.findById(user.userId).pipe(Effect.map(toUserDto))),
        ),
      {
        auth: true,
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardUser },
        detail: {
          summary: "Read the signed in account",
          operationId: AUTH_OPERATION_ID.getCurrentUser,
          tags: [API_TAG.auth],
        },
      },
    )
    .patch(
      AUTH_PATH.me,
      ({ runAuthFx, user, body }) =>
        runAuthFx(
          Effect.flatMap(Users, (users) =>
            users.updateProfile(user.userId, body).pipe(Effect.map(toUserDto)),
          ),
        ),
      {
        auth: true,
        body: standardUpdateProfileBody,
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardUser },
        detail: {
          summary: "Update the signed in account",
          operationId: AUTH_OPERATION_ID.updateCurrentUser,
          tags: [API_TAG.auth],
        },
      },
    )
    .post(
      AUTH_PATH.emailVerifyRequest,
      ({ runAuthFx, user, set }) => {
        set.status = HTTP_STATUS.accepted
        return runAuthFx(
          Effect.flatMap(Users, (users) =>
            users.requestEmailVerification(user.userId).pipe(Effect.as(ACCEPTED_BODY)),
          ),
        )
      },
      {
        auth: true,
        response: { ...FAILURES, [HTTP_STATUS.accepted]: standardAccepted },
        detail: {
          summary: "Send a fresh email verification link",
          operationId: AUTH_OPERATION_ID.requestEmailVerification,
          tags: [API_TAG.auth],
        },
      },
    )
    .post(
      AUTH_PATH.emailVerify,
      ({ runAuthFx, requestContext, body, set }) => {
        set.status = HTTP_STATUS.noContent
        return runAuthFx(
          Effect.flatMap(Users, (users) =>
            users.verifyEmail(body.token, requestContext).pipe(Effect.as(null)),
          ),
        )
      },
      {
        body: standardVerifyEmailBody,
        response: { ...FAILURES, [HTTP_STATUS.noContent]: standardNoContent },
        detail: {
          summary: "Confirm an email address",
          operationId: AUTH_OPERATION_ID.verifyEmail,
          tags: [API_TAG.auth],
        },
      },
    )
