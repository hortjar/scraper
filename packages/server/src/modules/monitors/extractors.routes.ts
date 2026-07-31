import { API_TAG, HTTP_STATUS } from "@scraper/core/constants"
import { Effect, Schema } from "effect"

import type { AuthPluginOptions } from "../auth/index.js"
import { authBase, FAILURES, requireUser, standardNoContent } from "../auth/index.js"

import {
  MONITOR_ACTION,
  MONITOR_OPERATION_ID,
  MONITOR_PATH,
  MONITOR_PLUGIN,
} from "./monitors.constants.js"
import { toExtractorDto } from "./monitors.dto.js"
import type { MonitorServices } from "./monitors.routes.js"
import {
  ExtractorDto,
  ExtractorInput,
  ExtractorListDto,
  ExtractorParameters,
  MonitorIdParameters,
  UpdateExtractorBody,
} from "./monitors.schema.js"
import { Monitors } from "./monitors.service.js"

const standardParameters = Schema.standardSchemaV1(MonitorIdParameters)
const standardExtractor = Schema.standardSchemaV1(ExtractorInput)
const standardExtractorPatch = Schema.standardSchemaV1(UpdateExtractorBody)
const standardExtractorParameters = Schema.standardSchemaV1(ExtractorParameters)
const standardExtractorDto = Schema.standardSchemaV1(ExtractorDto)
const standardExtractorList = Schema.standardSchemaV1(ExtractorListDto)

const READ_SCOPE = "monitors:read"
const WRITE_SCOPE = "monitors:write"

export const extractorHandlers = (options: AuthPluginOptions<MonitorServices>) =>
  authBase<MonitorServices>(options, MONITOR_PLUGIN.extractorHandlers)
    .use(requireUser(options))
    .get(
      MONITOR_PATH.extractors,
      ({ runAuthFx, user, params }) =>
        runAuthFx(
          Effect.flatMap(Monitors, (monitors) =>
            monitors
              .listExtractors(user.userId, params.monitorId)
              .pipe(Effect.map((items) => ({ items: items.map((item) => toExtractorDto(item)) }))),
          ),
        ),
      {
        auth: { scopes: [READ_SCOPE] },
        params: standardParameters,
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardExtractorList },
        detail: {
          summary: "List a monitor's extractors",
          operationId: MONITOR_OPERATION_ID.listExtractors,
          tags: [API_TAG.monitors],
        },
      },
    )
    .post(
      MONITOR_PATH.extractors,
      ({ runAuthFx, user, params, body, set }) => {
        set.status = HTTP_STATUS.created
        return runAuthFx(
          Effect.flatMap(Monitors, (monitors) =>
            monitors
              .addExtractor(user.userId, params.monitorId, body)
              .pipe(Effect.map((extractor) => toExtractorDto(extractor))),
          ),
        )
      },
      {
        auth: { scopes: [WRITE_SCOPE], action: MONITOR_ACTION.extractorAdd },
        params: standardParameters,
        body: standardExtractor,
        response: { ...FAILURES, [HTTP_STATUS.created]: standardExtractorDto },
        detail: {
          summary: "Add an extractor to a monitor",
          operationId: MONITOR_OPERATION_ID.addExtractor,
          tags: [API_TAG.monitors],
        },
      },
    )
    .patch(
      MONITOR_PATH.extractorById,
      ({ runAuthFx, user, params, body }) =>
        runAuthFx(
          Effect.flatMap(Monitors, (monitors) =>
            monitors
              .editExtractor(user.userId, params.monitorId, params.extractorId, body)
              .pipe(Effect.map((extractor) => toExtractorDto(extractor))),
          ),
        ),
      {
        auth: { scopes: [WRITE_SCOPE], action: MONITOR_ACTION.extractorUpdate },
        params: standardExtractorParameters,
        body: standardExtractorPatch,
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardExtractorDto },
        detail: {
          summary: "Update a single extractor",
          operationId: MONITOR_OPERATION_ID.updateExtractor,
          tags: [API_TAG.monitors],
        },
      },
    )
    .delete(
      MONITOR_PATH.extractorById,
      ({ runAuthFx, user, params, set }) => {
        set.status = HTTP_STATUS.noContent
        return runAuthFx(
          Effect.flatMap(Monitors, (monitors) =>
            monitors
              .removeExtractor(user.userId, params.monitorId, params.extractorId)
              .pipe(Effect.as(null)),
          ),
        )
      },
      {
        auth: { scopes: [WRITE_SCOPE], action: MONITOR_ACTION.extractorRemove },
        params: standardExtractorParameters,
        response: { ...FAILURES, [HTTP_STATUS.noContent]: standardNoContent },
        detail: {
          summary: "Delete a single extractor",
          operationId: MONITOR_OPERATION_ID.removeExtractor,
          tags: [API_TAG.monitors],
        },
      },
    )
