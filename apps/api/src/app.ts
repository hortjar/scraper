import type { RootConfig } from "@scraper/core/config"
import { ROUTE } from "@scraper/core/constants"
import { authRoutes } from "@scraper/server/modules/auth"
import { monitorRoutes } from "@scraper/server/modules/monitors"
import { channelRoutes } from "@scraper/server/modules/notifications"
import { runRoutes } from "@scraper/server/modules/runs"
import { Elysia } from "elysia"

import type { HealthProbe } from "./health/health-probe.js"
import { effectPlugin } from "./plugins/effect.js"
import { errorHandlerPlugin } from "./plugins/error-handler.js"
import { observabilityPlugin } from "./plugins/observability.js"
import { openapiPlugin } from "./plugins/openapi.js"
import { securityPlugin } from "./plugins/security.js"
import { systemRoutes } from "./routes/system.js"
import type { AppRuntime } from "./runtime.js"

export interface CreateAppOptions {
  readonly runtime: AppRuntime
  readonly redisProbe: HealthProbe
  readonly config: RootConfig
}

export const createApiRoutes = ({ runtime, redisProbe, config }: CreateAppOptions) =>
  new Elysia()
    .use(securityPlugin({ corsOrigins: config.http.corsOrigins }))
    .use(observabilityPlugin(runtime))
    .use(errorHandlerPlugin(runtime))
    .use(effectPlugin(runtime))
    .use(openapiPlugin)
    .use(systemRoutes(runtime, redisProbe))
    .use(authRoutes({ runtime, config }))
    .use(monitorRoutes({ runtime, config }))
    .use(runRoutes({ runtime, config }))
    .use(channelRoutes({ runtime, config }))

export const createApp = (options: CreateAppOptions) =>
  new Elysia().group(ROUTE.apiBase, (api) => api.use(createApiRoutes(options)))

export type App = ReturnType<typeof createApp>
