import { API_TAG, HTTP_STATUS, PAGINATION, ROUTE } from "@scraper/core/constants"
import { Effect, Schema } from "effect"
import { Elysia } from "elysia"

import type { AuthPluginOptions } from "../auth/index.js"
import { authBase, FAILURES, requireUser, standardNoContent } from "../auth/index.js"

import {
  MONITOR_ACTION,
  MONITOR_OPERATION_ID,
  MONITOR_PATH,
  MONITOR_PLUGIN,
} from "./monitors.constants.js"
import { toMonitorDetailDto, toMonitorDto } from "./monitors.dto.js"
import {
  CreateMonitorBody,
  MonitorDetailDto,
  MonitorIdParameters,
  MonitorListDto,
  UpdateMonitorBody,
} from "./monitors.schema.js"
import { Monitors } from "./monitors.service.js"

const standardCreate = Schema.standardSchemaV1(CreateMonitorBody)
const standardUpdate = Schema.standardSchemaV1(UpdateMonitorBody)
const standardParameters = Schema.standardSchemaV1(MonitorIdParameters)
const standardDetail = Schema.standardSchemaV1(MonitorDetailDto)
const standardList = Schema.standardSchemaV1(MonitorListDto)

const READ_SCOPE = "monitors:read"
const WRITE_SCOPE = "monitors:write"

const limitFrom = (raw: string | undefined): number => {
  if (raw === undefined) return PAGINATION.defaultLimit
  const parsed = Math.trunc(Number(raw))
  if (!Number.isFinite(parsed)) return PAGINATION.defaultLimit
  return Math.min(Math.max(parsed, 1), PAGINATION.maxLimit)
}

export type MonitorServices = Monitors

const monitorHandlers = (options: AuthPluginOptions<MonitorServices>) =>
  authBase<MonitorServices>(options, MONITOR_PLUGIN.handlers)
    .use(requireUser(options))
    .get(
      MONITOR_PATH.root,
      ({ runAuthFx, user, query }) =>
        runAuthFx(
          Effect.flatMap(Monitors, (monitors) =>
            monitors
              .list(user.userId, {
                cursor: query.cursor,
                limit: limitFrom(query.limit),
                tag: query.tag,
                search: query.search,
              })
              .pipe(
                Effect.map((page) => ({
                  items: page.items.map((monitor) => toMonitorDto(monitor)),
                  nextCursor: page.nextCursor,
                })),
              ),
          ),
        ),
      {
        auth: { scopes: [READ_SCOPE] },
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardList },
        detail: {
          summary: "List monitors",
          operationId: MONITOR_OPERATION_ID.list,
          tags: [API_TAG.monitors],
        },
      },
    )
    .post(
      MONITOR_PATH.root,
      ({ runAuthFx, user, body, set }) => {
        set.status = HTTP_STATUS.created
        return runAuthFx(
          Effect.flatMap(Monitors, (monitors) =>
            monitors
              .create(user.userId, body)
              .pipe(
                Effect.map(({ extractors, monitor }) => toMonitorDetailDto(monitor, extractors)),
              ),
          ),
        )
      },
      {
        auth: { scopes: [WRITE_SCOPE], action: MONITOR_ACTION.create },
        body: standardCreate,
        response: { ...FAILURES, [HTTP_STATUS.created]: standardDetail },
        detail: {
          summary: "Create a monitor",
          operationId: MONITOR_OPERATION_ID.create,
          tags: [API_TAG.monitors],
        },
      },
    )
    .get(
      MONITOR_PATH.byId,
      ({ runAuthFx, user, params }) =>
        runAuthFx(
          Effect.flatMap(Monitors, (monitors) =>
            monitors
              .detail(user.userId, params.monitorId)
              .pipe(
                Effect.map(({ extractors, monitor }) => toMonitorDetailDto(monitor, extractors)),
              ),
          ),
        ),
      {
        auth: { scopes: [READ_SCOPE] },
        params: standardParameters,
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardDetail },
        detail: {
          summary: "Get a monitor",
          operationId: MONITOR_OPERATION_ID.get,
          tags: [API_TAG.monitors],
        },
      },
    )
    .patch(
      MONITOR_PATH.byId,
      ({ runAuthFx, user, params, body }) =>
        runAuthFx(
          Effect.flatMap(Monitors, (monitors) =>
            monitors
              .update(user.userId, params.monitorId, body)
              .pipe(
                Effect.map(({ extractors, monitor }) => toMonitorDetailDto(monitor, extractors)),
              ),
          ),
        ),
      {
        auth: { scopes: [WRITE_SCOPE], action: MONITOR_ACTION.update },
        params: standardParameters,
        body: standardUpdate,
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardDetail },
        detail: {
          summary: "Update a monitor",
          operationId: MONITOR_OPERATION_ID.update,
          tags: [API_TAG.monitors],
        },
      },
    )
    .delete(
      MONITOR_PATH.byId,
      ({ runAuthFx, user, params, set }) => {
        set.status = HTTP_STATUS.noContent
        return runAuthFx(
          Effect.flatMap(Monitors, (monitors) =>
            monitors.remove(user.userId, params.monitorId).pipe(Effect.as(null)),
          ),
        )
      },
      {
        auth: { scopes: [WRITE_SCOPE], action: MONITOR_ACTION.remove },
        params: standardParameters,
        response: { ...FAILURES, [HTTP_STATUS.noContent]: standardNoContent },
        detail: {
          summary: "Delete a monitor",
          operationId: MONITOR_OPERATION_ID.remove,
          tags: [API_TAG.monitors],
        },
      },
    )

export const monitorRoutes = (options: AuthPluginOptions<MonitorServices>) =>
  new Elysia({
    name: MONITOR_PLUGIN.routes,
    prefix: ROUTE.monitors,
    tags: [API_TAG.monitors],
  }).use(monitorHandlers(options))
