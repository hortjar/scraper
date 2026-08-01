import { API_TAG, HTTP_STATUS, ROUTE } from "@scraper/core/constants"
import { Effect, Schema } from "effect"
import { Elysia } from "elysia"

import type { AuthPluginOptions } from "../auth/index.js"
import { authBase, FAILURES, requireUser } from "../auth/index.js"

import { LOG_ACTION, LOG_OPERATION_ID, LOG_PATH, LOG_PLUGIN } from "./logs.constants.js"
import { LogListDto } from "./logs.schema.js"
import { Logs } from "./logs.service.js"

const standardLogs = Schema.standardSchemaV1(LogListDto)

const READ_SCOPE = "monitors:read"

export type LogServices = Logs

export const logRoutes = (options: AuthPluginOptions<LogServices>) =>
  new Elysia({ name: LOG_PLUGIN.handlers, prefix: ROUTE.admin, tags: [API_TAG.admin] })
    .use(authBase<LogServices>(options, `${LOG_PLUGIN.handlers}/base`).use(requireUser(options)))
    .get(
      LOG_PATH.list,
      ({ runAuthFx, user, query }) =>
        runAuthFx(Effect.flatMap(Logs, (logs) => logs.list(user.role, query))),
      {
        auth: { scopes: [READ_SCOPE], action: LOG_ACTION.list },
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardLogs },
        detail: {
          summary: "Recent application logs from both services",
          operationId: LOG_OPERATION_ID.list,
          tags: [API_TAG.admin],
        },
      },
    )
