import { API_TAG, ROUTE } from "@scraper/core/constants"
import { Elysia } from "elysia"

import { AUTH_PLUGIN } from "./auth.constants.js"
import type { AuthPluginOptions } from "./auth.http.js"
import { accountRoutes } from "./routes/account.routes.js"
import { apiKeyRoutes } from "./routes/api-key.routes.js"
import { passwordRoutes } from "./routes/password.routes.js"
import { sessionRoutes } from "./routes/session.routes.js"

export const authRoutes = (options: AuthPluginOptions) =>
  new Elysia({ name: AUTH_PLUGIN.routes, prefix: ROUTE.auth, tags: [API_TAG.auth] })
    .use(accountRoutes(options, AUTH_PLUGIN.account))
    .use(passwordRoutes(options, AUTH_PLUGIN.password))
    .use(sessionRoutes(options, AUTH_PLUGIN.sessions))
    .use(apiKeyRoutes(options, AUTH_PLUGIN.apiKeys))
