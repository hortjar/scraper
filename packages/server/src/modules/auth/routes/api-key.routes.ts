import { API_TAG, HTTP_STATUS } from "@scraper/core/constants"
import { Effect, Schema } from "effect"

import { AUTH_OPERATION_ID, AUTH_PATH } from "../auth.constants.js"
import type { AuthPluginOptions } from "../auth.http.js"
import { authBase } from "../auth.http.js"
import { requireUser } from "../auth.macro.js"
import { ApiKeyIdParameters as ApiKeyIdParameters, CreateApiKeyBody } from "../auth.schema.js"
import { ApiKeys } from "../keys/api-keys.service.js"

import {
  FAILURES,
  standardApiKeyList,
  standardCreatedApiKey,
  standardNoContent,
} from "./auth.responses.js"

const standardCreateApiKeyBody = Schema.standardSchemaV1(CreateApiKeyBody)
const standardApiKeyParameters = Schema.standardSchemaV1(ApiKeyIdParameters)

export const apiKeyRoutes = (options: AuthPluginOptions, pluginName: string) =>
  authBase(options, pluginName)
    .use(requireUser(options))
    .get(
      AUTH_PATH.apiKeys,
      ({ runAuthFx, user }) =>
        runAuthFx(
          Effect.flatMap(ApiKeys, (keys) =>
            keys.list(user.userId).pipe(Effect.map((items) => ({ items }))),
          ),
        ),
      {
        auth: { sessionOnly: true },
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardApiKeyList },
        detail: {
          summary: "List API keys",
          operationId: AUTH_OPERATION_ID.listApiKeys,
          tags: [API_TAG.auth],
        },
      },
    )
    .post(
      AUTH_PATH.apiKeys,
      ({ runAuthFx, requestContext, user, body, set }) => {
        set.status = HTTP_STATUS.created
        return runAuthFx(
          Effect.flatMap(ApiKeys, (keys) => keys.create(user.userId, body, requestContext)),
        )
      },
      {
        auth: { sessionOnly: true },
        body: standardCreateApiKeyBody,
        response: { ...FAILURES, [HTTP_STATUS.created]: standardCreatedApiKey },
        detail: {
          summary: "Create an API key, shown once",
          operationId: AUTH_OPERATION_ID.createApiKey,
          tags: [API_TAG.auth],
        },
      },
    )
    .delete(
      AUTH_PATH.apiKeyById,
      ({ runAuthFx, requestContext, user, params, set }) => {
        set.status = HTTP_STATUS.noContent
        return runAuthFx(
          Effect.flatMap(ApiKeys, (keys) =>
            keys.revoke(user.userId, params.apiKeyId, requestContext).pipe(Effect.as(null)),
          ),
        )
      },
      {
        auth: { sessionOnly: true },
        params: standardApiKeyParameters,
        response: { ...FAILURES, [HTTP_STATUS.noContent]: standardNoContent },
        detail: {
          summary: "Revoke an API key",
          operationId: AUTH_OPERATION_ID.revokeApiKey,
          tags: [API_TAG.auth],
        },
      },
    )
