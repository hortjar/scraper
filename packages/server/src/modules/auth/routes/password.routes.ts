import { API_TAG, HTTP_STATUS } from "@scraper/core/constants"
import { Effect, Schema } from "effect"

import { AUTH_OPERATION, AUTH_OPERATION_ID, AUTH_PATH } from "../auth.constants.js"
import type { AuthPluginOptions } from "../auth.http.js"
import { authBase } from "../auth.http.js"
import { requireUser } from "../auth.macro.js"
import { ChangePasswordBody, RequestPasswordResetBody, ResetPasswordBody } from "../auth.schema.js"
import { Users } from "../users/users.service.js"

import { ACCEPTED_BODY, FAILURES, standardAccepted, standardNoContent } from "./auth.responses.js"

const standardChangePasswordBody = Schema.standardSchemaV1(ChangePasswordBody)
const standardRequestResetBody = Schema.standardSchemaV1(RequestPasswordResetBody)
const standardResetBody = Schema.standardSchemaV1(ResetPasswordBody)

export const passwordRoutes = (options: AuthPluginOptions, pluginName: string) =>
  authBase(options, pluginName)
    .use(requireUser(options))
    .patch(
      AUTH_PATH.password,
      ({ runAuthFx, requestContext, user, body, set }) => {
        set.status = HTTP_STATUS.noContent
        return runAuthFx(
          Effect.flatMap(Users, (users) =>
            users.changePassword(user.userId, body, requestContext).pipe(Effect.as(null)),
          ),
        )
      },
      {
        auth: { sessionOnly: true, action: AUTH_OPERATION.passwordChange },
        body: standardChangePasswordBody,
        response: { ...FAILURES, [HTTP_STATUS.noContent]: standardNoContent },
        detail: {
          summary: "Change the current password",
          operationId: AUTH_OPERATION_ID.changePassword,
          tags: [API_TAG.auth],
        },
      },
    )
    .post(
      AUTH_PATH.passwordResetRequest,
      ({ runAuthFx, requestContext, body, set }) => {
        set.status = HTTP_STATUS.accepted
        return runAuthFx(
          Effect.flatMap(Users, (users) =>
            users.requestPasswordReset(body.email, requestContext).pipe(Effect.as(ACCEPTED_BODY)),
          ),
        )
      },
      {
        body: standardRequestResetBody,
        response: { ...FAILURES, [HTTP_STATUS.accepted]: standardAccepted },
        detail: {
          summary: "Send a password reset link",
          operationId: AUTH_OPERATION_ID.requestPasswordReset,
          tags: [API_TAG.auth],
        },
      },
    )
    .post(
      AUTH_PATH.passwordReset,
      ({ runAuthFx, requestContext, body, set }) => {
        set.status = HTTP_STATUS.noContent
        return runAuthFx(
          Effect.flatMap(Users, (users) =>
            users.resetPassword(body.token, body.password, requestContext).pipe(Effect.as(null)),
          ),
        )
      },
      {
        body: standardResetBody,
        response: { ...FAILURES, [HTTP_STATUS.noContent]: standardNoContent },
        detail: {
          summary: "Set a new password from a reset link",
          operationId: AUTH_OPERATION_ID.resetPassword,
          tags: [API_TAG.auth],
        },
      },
    )
