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
  readonly corsOrigins: readonly string[]
}

export const createApp = ({ runtime, redisProbe, corsOrigins }: CreateAppOptions) =>
  new Elysia()
    .use(securityPlugin({ corsOrigins }))
    .use(observabilityPlugin(runtime))
    .use(errorHandlerPlugin(runtime))
    .use(effectPlugin(runtime))
    .use(openapiPlugin)
    .use(systemRoutes(runtime, redisProbe))

export type App = ReturnType<typeof createApp>
