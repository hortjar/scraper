import { AppConfig } from "@scraper/core/config"
import { API_TAG, CONTENT_TYPE, HEADER, HTTP_STATUS, ROUTE } from "@scraper/core/constants"
import { Translator } from "@scraper/core/i18n"
import { Database } from "@scraper/db"
import { Clock, Effect, Schema } from "effect"
import { Elysia } from "elysia"

import {
  type HealthProbe,
  type HealthProbeResult,
  runHealthProbes,
} from "../health/health-probe.js"
import { renderPrometheusText } from "../observability/prometheus.js"
import type { AppRuntime } from "../runtime.js"

import { HEALTH_STATUS, PROBE_NAME, READY_STATUS, SYSTEM_OPERATION_ID } from "./system.constants.js"
import { HealthResponse, MetaResponse, MetricsResponse, ReadyResponse } from "./system.schema.js"

const standardHealthResponse = Schema.standardSchemaV1(HealthResponse)
const standardReadyResponse = Schema.standardSchemaV1(ReadyResponse)
const standardMetricsResponse = Schema.standardSchemaV1(MetricsResponse)
const standardMetaResponse = Schema.standardSchemaV1(MetaResponse)

const toChecks = (results: readonly HealthProbeResult[]) => ({
  database: results.find((result) => result.name === PROBE_NAME.database)?.healthy ?? false,
  redis: results.find((result) => result.name === PROBE_NAME.redis)?.healthy ?? false,
})

const healthEffect = Effect.gen(function* () {
  const config = yield* AppConfig
  const millis = yield* Clock.currentTimeMillis
  return {
    status: HEALTH_STATUS.ok,
    version: config.app.version,
    commit: config.app.gitSha,
    time: new Date(millis).toISOString(),
  }
})

const readinessEffect = (redisProbe: HealthProbe) =>
  Effect.gen(function* () {
    const db = yield* Database
    const millis = yield* Clock.currentTimeMillis
    const results = yield* runHealthProbes([
      { name: PROBE_NAME.database, check: db.health.pipe(Effect.orElseSucceed(() => false)) },
      redisProbe,
    ])
    const checks = toChecks(results)
    const healthy = checks.database && checks.redis
    return {
      status: healthy ? READY_STATUS.ok : READY_STATUS.unhealthy,
      checks,
      time: new Date(millis).toISOString(),
    }
  })

const metaEffect = Effect.gen(function* () {
  const config = yield* AppConfig
  const translator = yield* Translator
  return {
    locales: translator.locales(),
    defaultLocale: config.app.defaultLocale,
    registrationOpen: config.http.enableRegistration,
    channelKinds: [] as readonly string[],
  }
})

export const systemRoutes = (runtime: AppRuntime, redisProbe: HealthProbe) =>
  new Elysia({ tags: [API_TAG.system] })
    .get(ROUTE.health, () => runtime.runPromise(healthEffect), {
      response: { [HTTP_STATUS.ok]: standardHealthResponse },
      detail: { summary: "Liveness probe", operationId: SYSTEM_OPERATION_ID.getHealth },
    })
    .get(
      ROUTE.ready,
      async ({ set }) => {
        const result = await runtime.runPromise(readinessEffect(redisProbe))
        set.status =
          result.status === READY_STATUS.ok ? HTTP_STATUS.ok : HTTP_STATUS.serviceUnavailable
        return result
      },
      {
        response: {
          [HTTP_STATUS.ok]: standardReadyResponse,
          [HTTP_STATUS.serviceUnavailable]: standardReadyResponse,
        },
        detail: { summary: "Readiness probe", operationId: SYSTEM_OPERATION_ID.getReadiness },
      },
    )
    .get(
      ROUTE.metrics,
      ({ set }) => {
        set.headers[HEADER.contentType] = CONTENT_TYPE.text
        return runtime.runPromise(renderPrometheusText)
      },
      {
        response: { [HTTP_STATUS.ok]: standardMetricsResponse },
        detail: { summary: "Prometheus metrics", operationId: SYSTEM_OPERATION_ID.getMetrics },
      },
    )
    .get(ROUTE.meta, () => runtime.runPromise(metaEffect), {
      response: { [HTTP_STATUS.ok]: standardMetaResponse },
      detail: { summary: "Public runtime metadata", operationId: SYSTEM_OPERATION_ID.getMeta },
    })
