import { API_TAG, HTTP_STATUS, ROUTE } from "@scraper/core/constants"
import { Effect, Schema } from "effect"
import { Elysia } from "elysia"

import type { AuthPluginOptions } from "../auth/index.js"
import { authBase, FAILURES, requireUser } from "../auth/index.js"

import {
  ADMIN_ACTION,
  ADMIN_OPERATION_ID,
  ADMIN_PATH,
  ADMIN_PLUGIN,
  ADMIN_SCOPE,
} from "./admin.constants.js"
import { AdminStatsDto } from "./admin.schema.js"
import { Admin } from "./admin.service.js"

const standardStats = Schema.standardSchemaV1(AdminStatsDto)

export type AdminServices = Admin

const adminHandlers = (options: AuthPluginOptions<AdminServices>) =>
  authBase<AdminServices>(options, ADMIN_PLUGIN.handlers)
    .use(requireUser(options))
    .get(
      ADMIN_PATH.stats,
      ({ runAuthFx, user }) => runAuthFx(Effect.flatMap(Admin, (admin) => admin.stats(user.role))),
      {
        auth: { scopes: [ADMIN_SCOPE], action: ADMIN_ACTION.stats },
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardStats },
        detail: {
          summary: "System counts and queue depths",
          operationId: ADMIN_OPERATION_ID.stats,
          tags: [API_TAG.admin],
        },
      },
    )

export const adminRoutes = (options: AuthPluginOptions<AdminServices>) =>
  new Elysia({ name: ADMIN_PLUGIN.routes, prefix: ROUTE.admin, tags: [API_TAG.admin] }).use(
    adminHandlers(options),
  )
