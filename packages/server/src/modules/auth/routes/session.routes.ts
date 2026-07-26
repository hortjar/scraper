import { API_TAG, HTTP_STATUS } from "@scraper/core/constants"
import { Effect, Schema } from "effect"

import { AUTH_OPERATION_ID, AUTH_PATH } from "../auth.constants.js"
import type { AuthPluginOptions } from "../auth.http.js"
import { authBase } from "../auth.http.js"
import { requireUser } from "../auth.macro.js"
import { SessionIdParameters as SessionIdParameters } from "../auth.schema.js"
import { Sessions } from "../sessions/sessions.service.js"

import { FAILURES, standardNoContent, standardSessionList } from "./auth.responses.js"

const standardSessionParameters = Schema.standardSchemaV1(SessionIdParameters)

export const sessionRoutes = (options: AuthPluginOptions, pluginName: string) =>
  authBase(options, pluginName)
    .use(requireUser(options))
    .get(
      AUTH_PATH.sessions,
      ({ runAuthFx, user }) =>
        runAuthFx(
          Effect.flatMap(Sessions, (sessions) =>
            sessions.list(user.userId, user.sessionId).pipe(Effect.map((items) => ({ items }))),
          ),
        ),
      {
        auth: true,
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardSessionList },
        detail: {
          summary: "List active sessions",
          operationId: AUTH_OPERATION_ID.listSessions,
          tags: [API_TAG.auth],
        },
      },
    )
    .delete(
      AUTH_PATH.sessionById,
      ({ runAuthFx, requestContext, user, params, set }) => {
        set.status = HTTP_STATUS.noContent
        return runAuthFx(
          Effect.flatMap(Sessions, (sessions) =>
            sessions.revoke(user.userId, params.sessionId, requestContext).pipe(Effect.as(null)),
          ),
        )
      },
      {
        auth: true,
        params: standardSessionParameters,
        response: { ...FAILURES, [HTTP_STATUS.noContent]: standardNoContent },
        detail: {
          summary: "Revoke one session",
          operationId: AUTH_OPERATION_ID.revokeSession,
          tags: [API_TAG.auth],
        },
      },
    )
    .delete(
      AUTH_PATH.sessions,
      ({ runAuthFx, requestContext, user, set }) => {
        set.status = HTTP_STATUS.noContent
        return runAuthFx(
          Effect.flatMap(Sessions, (sessions) =>
            sessions.revokeAll(user.userId, requestContext, null).pipe(Effect.as(null)),
          ),
        )
      },
      {
        auth: true,
        response: { ...FAILURES, [HTTP_STATUS.noContent]: standardNoContent },
        detail: {
          summary: "Log out everywhere",
          operationId: AUTH_OPERATION_ID.revokeAllSessions,
          tags: [API_TAG.auth],
        },
      },
    )
