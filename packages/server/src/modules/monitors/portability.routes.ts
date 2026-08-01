import { API_TAG, HTTP_STATUS } from "@scraper/core/constants"
import { Effect, Schema } from "effect"

import type { AuthPluginOptions } from "../auth/index.js"
import { authBase, FAILURES, requireUser } from "../auth/index.js"

import {
  MONITOR_ACTION,
  MONITOR_OPERATION_ID,
  MONITOR_PATH,
  MONITOR_PLUGIN,
} from "./monitors.constants.js"
import { toMonitorDto } from "./monitors.dto.js"
import type { MonitorServices } from "./monitors.routes.js"
import {
  ImportMonitorsBody,
  MonitorConfigDto,
  MonitorIdParameters,
  MonitorImportResultDto,
} from "./monitors.schema.js"
import { Monitors } from "./monitors.service.js"

const standardParameters = Schema.standardSchemaV1(MonitorIdParameters)
const standardConfig = Schema.standardSchemaV1(MonitorConfigDto)
const standardImport = Schema.standardSchemaV1(ImportMonitorsBody)
const standardImportResult = Schema.standardSchemaV1(MonitorImportResultDto)

const READ_SCOPE = "monitors:read"
const WRITE_SCOPE = "monitors:write"

export const portabilityHandlers = (options: AuthPluginOptions<MonitorServices>) =>
  authBase<MonitorServices>(options, MONITOR_PLUGIN.portabilityHandlers)
    .use(requireUser(options))
    .get(
      MONITOR_PATH.export,
      ({ runAuthFx, user, params }) =>
        runAuthFx(
          Effect.flatMap(Monitors, (monitors) =>
            monitors.exportConfig(user.userId, params.monitorId),
          ),
        ),
      {
        auth: { scopes: [READ_SCOPE], action: MONITOR_ACTION.export },
        params: standardParameters,
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardConfig },
        detail: {
          summary: "Export a monitor's portable configuration",
          operationId: MONITOR_OPERATION_ID.export,
          tags: [API_TAG.monitors],
        },
      },
    )
    .post(
      MONITOR_PATH.import,
      ({ runAuthFx, user, body, set }) => {
        set.status = HTTP_STATUS.created
        return runAuthFx(
          Effect.flatMap(Monitors, (monitors) =>
            monitors
              .importConfigs(user.userId, body)
              .pipe(Effect.map((monitors_) => ({ items: monitors_.map((m) => toMonitorDto(m)) }))),
          ),
        )
      },
      {
        auth: { scopes: [WRITE_SCOPE], action: MONITOR_ACTION.import },
        body: standardImport,
        response: { ...FAILURES, [HTTP_STATUS.created]: standardImportResult },
        detail: {
          summary: "Import monitors from exported configurations",
          operationId: MONITOR_OPERATION_ID.import,
          tags: [API_TAG.monitors],
        },
      },
    )
