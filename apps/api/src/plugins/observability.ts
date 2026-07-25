import { HEADER, LOG_FIELD, PLUGIN } from "@scraper/core/constants"
import { metrics } from "@scraper/core/observability"
import { Effect, Metric } from "effect"
import { Elysia } from "elysia"

import type { AppRuntime } from "../runtime.js"

const resolveStatus = (status: number | string | undefined): number =>
  typeof status === "number" ? status : 200

const describeError = (error: unknown): { readonly name: string; readonly message: string } =>
  error instanceof Error
    ? { name: error.name, message: error.message }
    : { name: "HttpStatusResponse", message: JSON.stringify(error) }

export const observabilityPlugin = (runtime: AppRuntime) =>
  new Elysia({ name: PLUGIN.observability })
    .derive({ as: "global" }, ({ headers, set }) => {
      const requestId = headers[HEADER.requestId] ?? crypto.randomUUID()
      set.headers[HEADER.requestId] = requestId
      return { requestId, requestStartedAt: performance.now() }
    })
    .onAfterResponse(
      { as: "global" },
      ({ request, path, set, requestId, requestStartedAt }) => {
        const startedAt = requestStartedAt ?? performance.now()
        const durationMs = performance.now() - startedAt
        const status = resolveStatus(set.status)
        runtime.runFork(
          Effect.all(
            [
              Metric.increment(metrics.httpRequests),
              Metric.update(metrics.httpDuration, durationMs / 1000),
              Effect.logInfo("http.request").pipe(
                Effect.annotateLogs({
                  [LOG_FIELD.requestId]: requestId ?? String(set.headers[HEADER.requestId] ?? ""),
                  method: request.method,
                  path,
                  status,
                  [LOG_FIELD.durationMs]: durationMs,
                }),
              ),
            ],
            { discard: true },
          ),
        )
      },
    )
    .onError({ as: "global" }, ({ request, path, error, requestId, requestStartedAt }) => {
      const durationMs = performance.now() - (requestStartedAt ?? performance.now())
      const described = describeError(error)
      runtime.runFork(
        Effect.logError("http.request.error").pipe(
          Effect.annotateLogs({
            [LOG_FIELD.requestId]: requestId ?? crypto.randomUUID(),
            method: request.method,
            path,
            [LOG_FIELD.durationMs]: durationMs,
            [LOG_FIELD.errorTag]: described.name,
            message: described.message,
          }),
        ),
      )
    })
