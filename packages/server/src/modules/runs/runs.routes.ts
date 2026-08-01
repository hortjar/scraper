import { API_TAG, HEADER, HTTP_STATUS, ROUTE } from "@scraper/core/constants"
import type { RunId } from "@scraper/core/domain"
import { Effect, Schema } from "effect"
import { Elysia } from "elysia"

import type { AuthPluginOptions } from "../auth/index.js"
import { authBase, FAILURES, requireUser, standardNoContent } from "../auth/index.js"
import { SCREENSHOT_CONTENT_TYPE } from "../storage/index.js"

import { RUN_ACTION, RUN_OPERATION_ID, RUN_PATH, RUN_PLUGIN } from "./runs.constants.js"
import { toChangeDto, toRunDetailDto, toRunDto } from "./runs.dto.js"
import type { StoredFieldRow } from "./runs.dto.js"
import {
  ChangeListDto,
  MonitorIdParameters,
  RunDetailDto,
  RunIdParameters,
  RunDiffDto,
  RunListDto,
  RunSnapshotDto,
  SeriesDto,
} from "./runs.schema.js"
import { Runs } from "./runs.service.js"

const standardMonitorParameters = Schema.standardSchemaV1(MonitorIdParameters)
const standardRunParameters = Schema.standardSchemaV1(RunIdParameters)
const standardRunList = Schema.standardSchemaV1(RunListDto)
const standardDiff = Schema.standardSchemaV1(RunDiffDto)
const standardSnapshot = Schema.standardSchemaV1(RunSnapshotDto)
const standardSeries = Schema.standardSchemaV1(SeriesDto)

const againstFrom = (raw: string | undefined): RunId | null =>
  raw === undefined || raw === "" ? null : (raw as RunId)
const standardChangeList = Schema.standardSchemaV1(ChangeListDto)
const standardRunDetail = Schema.standardSchemaV1(RunDetailDto)

const READ_SCOPE = "runs:read"
const WRITE_SCOPE = "monitors:write"

export type RunServices = Runs

const monitorScopedHandlers = (options: AuthPluginOptions<RunServices>) =>
  authBase<RunServices>(options, RUN_PLUGIN.monitorHandlers)
    .use(requireUser(options))
    .get(
      RUN_PATH.monitorRuns,
      ({ runAuthFx, user, params, query }) =>
        runAuthFx(
          Effect.flatMap(Runs, (runs) =>
            runs.list(user.userId, params.monitorId, query).pipe(
              Effect.map((page) => ({
                items: page.items.map((run) => toRunDto(run)),
                nextCursor: page.nextCursor,
              })),
            ),
          ),
        ),
      {
        auth: { scopes: [READ_SCOPE] },
        params: standardMonitorParameters,
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardRunList },
        detail: {
          summary: "List a monitor's runs",
          operationId: RUN_OPERATION_ID.list,
          tags: [API_TAG.runs],
        },
      },
    )
    .get(
      RUN_PATH.monitorChanges,
      ({ runAuthFx, user, params, query }) =>
        runAuthFx(
          Effect.flatMap(Runs, (runs) =>
            runs.listChanges(user.userId, params.monitorId, query).pipe(
              Effect.map((page) => ({
                items: page.items.map((change) => toChangeDto(change)),
                nextCursor: page.nextCursor,
              })),
            ),
          ),
        ),
      {
        auth: { scopes: [READ_SCOPE] },
        params: standardMonitorParameters,
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardChangeList },
        detail: {
          summary: "List a monitor's changes",
          operationId: RUN_OPERATION_ID.listChanges,
          tags: [API_TAG.runs],
        },
      },
    )
    .get(
      RUN_PATH.monitorSeries,
      ({ runAuthFx, user, params, query }) =>
        runAuthFx(
          Effect.flatMap(Runs, (runs) => runs.series(user.userId, params.monitorId, query)),
        ),
      {
        auth: { scopes: [READ_SCOPE] },
        params: standardMonitorParameters,
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardSeries },
        detail: {
          summary: "Numeric history for one extractor",
          operationId: RUN_OPERATION_ID.series,
          tags: [API_TAG.runs],
        },
      },
    )
    .post(
      RUN_PATH.runNow,
      ({ runAuthFx, user, params, set }) => {
        set.status = HTTP_STATUS.accepted
        return runAuthFx(
          Effect.flatMap(Runs, (runs) =>
            runs.trigger(user.userId, params.monitorId).pipe(Effect.as(null)),
          ),
        )
      },
      {
        auth: { scopes: [WRITE_SCOPE], action: RUN_ACTION.runNow },
        params: standardMonitorParameters,
        response: { ...FAILURES, [HTTP_STATUS.accepted]: standardNoContent },
        detail: {
          summary: "Queue a run now",
          operationId: RUN_OPERATION_ID.runNow,
          tags: [API_TAG.runs],
        },
      },
    )

const runScopedHandlers = (options: AuthPluginOptions<RunServices>) =>
  authBase<RunServices>(options, RUN_PLUGIN.runHandlers)
    .use(requireUser(options))
    .get(
      RUN_PATH.snapshot,
      ({ runAuthFx, user, params }) =>
        runAuthFx(Effect.flatMap(Runs, (runs) => runs.snapshot(user.userId, params.runId))),
      {
        auth: { scopes: [READ_SCOPE] },
        params: standardRunParameters,
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardSnapshot },
        detail: {
          summary: "Get the stored page snapshot for a run",
          operationId: RUN_OPERATION_ID.snapshot,
          tags: [API_TAG.runs],
        },
      },
    )
    .get(
      RUN_PATH.screenshot,
      ({ runAuthFx, user, params, set }) => {
        set.headers[HEADER.contentType] = SCREENSHOT_CONTENT_TYPE
        return runAuthFx(Effect.flatMap(Runs, (runs) => runs.screenshot(user.userId, params.runId)))
      },
      {
        auth: { scopes: [READ_SCOPE] },
        params: standardRunParameters,
        response: FAILURES,
        detail: {
          summary: "Get the full-page screenshot captured for a run",
          operationId: RUN_OPERATION_ID.screenshot,
          tags: [API_TAG.runs],
        },
      },
    )
    .get(
      RUN_PATH.diff,
      ({ runAuthFx, user, params, query }) =>
        runAuthFx(
          Effect.flatMap(Runs, (runs) =>
            runs.diff(user.userId, params.runId, againstFrom(query.against)),
          ),
        ),
      {
        auth: { scopes: [READ_SCOPE] },
        params: standardRunParameters,
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardDiff },
        detail: {
          summary: "Diff a run against its baseline or another run",
          operationId: RUN_OPERATION_ID.diff,
          tags: [API_TAG.runs],
        },
      },
    )
    .get(
      RUN_PATH.byId,
      ({ runAuthFx, user, params }) =>
        runAuthFx(
          Effect.flatMap(Runs, (runs) =>
            runs
              .findById(user.userId, params.runId)
              .pipe(
                Effect.map(({ fields, run, screenshotUrl }) =>
                  toRunDetailDto(run, fields as readonly StoredFieldRow[], screenshotUrl),
                ),
              ),
          ),
        ),
      {
        auth: { scopes: [READ_SCOPE] },
        params: standardRunParameters,
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardRunDetail },
        detail: {
          summary: "Get a run",
          operationId: RUN_OPERATION_ID.get,
          tags: [API_TAG.runs],
        },
      },
    )

const activityHandlers = (options: AuthPluginOptions<RunServices>) =>
  authBase<RunServices>(options, RUN_PLUGIN.activityHandlers)
    .use(requireUser(options))
    .get(
      RUN_PATH.activity,
      ({ runAuthFx, user, query }) =>
        runAuthFx(
          Effect.flatMap(Runs, (runs) =>
            runs.activity(user.userId, query).pipe(
              Effect.map((page) => ({
                items: page.items.map((change) => toChangeDto(change)),
                nextCursor: page.nextCursor,
              })),
            ),
          ),
        ),
      {
        auth: { scopes: [READ_SCOPE] },
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardChangeList },
        detail: {
          summary: "List changes across every monitor",
          operationId: RUN_OPERATION_ID.activity,
          tags: [API_TAG.runs],
        },
      },
    )

export const runRoutes = (options: AuthPluginOptions<RunServices>) =>
  new Elysia({ name: RUN_PLUGIN.routes, tags: [API_TAG.runs] })
    .use(
      new Elysia({ prefix: ROUTE.monitors, tags: [API_TAG.runs] }).use(
        monitorScopedHandlers(options),
      ),
    )
    .use(new Elysia({ prefix: ROUTE.runs, tags: [API_TAG.runs] }).use(runScopedHandlers(options)))
    .use(new Elysia({ prefix: ROUTE.changes, tags: [API_TAG.runs] }).use(activityHandlers(options)))
