import { API_TAG, HTTP_STATUS, ROUTE } from "@scraper/core/constants"
import { Effect, Schema } from "effect"
import { Elysia } from "elysia"

import type { AuthPluginOptions } from "../auth/index.js"
import { authBase, FAILURES, requireUser, standardNoContent } from "../auth/index.js"

import { CHANNEL_SCOPE } from "./channels.constants.js"
import { NOTIFICATIONS_OPERATION_ID } from "./notifications.constants.js"
import { RULE_PATH, RULE_PLUGIN } from "./rules.constants.js"
import { toRuleDto } from "./rules.dto.js"
import {
  CreateRuleBody,
  RuleDto,
  RuleIdParameters,
  RuleListDto,
  RuleMonitorParameters,
  UpdateRuleBody,
} from "./rules.schema.js"
import { Rules } from "./rules.service.js"

const standardCreate = Schema.standardSchemaV1(CreateRuleBody)
const standardUpdate = Schema.standardSchemaV1(UpdateRuleBody)
const standardRuleParameters = Schema.standardSchemaV1(RuleIdParameters)
const standardMonitorParameters = Schema.standardSchemaV1(RuleMonitorParameters)
const standardRule = Schema.standardSchemaV1(RuleDto)
const standardList = Schema.standardSchemaV1(RuleListDto)

export type RuleServices = Rules

const monitorRuleHandlers = (options: AuthPluginOptions<RuleServices>) =>
  authBase<RuleServices>(options, RULE_PLUGIN.monitorHandlers)
    .use(requireUser(options))
    .get(
      RULE_PATH.byMonitor,
      ({ runAuthFx, user, params }) =>
        runAuthFx(
          Effect.flatMap(Rules, (rules) =>
            rules
              .list(user.userId, params.monitorId)
              .pipe(Effect.map((items) => ({ items: items.map((item) => toRuleDto(item)) }))),
          ),
        ),
      {
        auth: { scopes: [CHANNEL_SCOPE.read] },
        params: standardMonitorParameters,
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardList },
        detail: {
          summary: "List notification rules for a monitor",
          operationId: NOTIFICATIONS_OPERATION_ID.listRules,
          tags: [API_TAG.rules],
        },
      },
    )
    .post(
      RULE_PATH.byMonitor,
      ({ runAuthFx, user, params, body, set }) => {
        set.status = HTTP_STATUS.created
        return runAuthFx(
          Effect.flatMap(Rules, (rules) =>
            rules
              .create(user.userId, params.monitorId, body)
              .pipe(Effect.map((rule) => toRuleDto(rule))),
          ),
        )
      },
      {
        auth: { scopes: [CHANNEL_SCOPE.write] },
        params: standardMonitorParameters,
        body: standardCreate,
        response: { ...FAILURES, [HTTP_STATUS.created]: standardRule },
        detail: {
          summary: "Create a notification rule",
          operationId: NOTIFICATIONS_OPERATION_ID.createRule,
          tags: [API_TAG.rules],
        },
      },
    )

const ruleHandlers = (options: AuthPluginOptions<RuleServices>) =>
  authBase<RuleServices>(options, RULE_PLUGIN.handlers)
    .use(requireUser(options))
    .patch(
      RULE_PATH.byId,
      ({ runAuthFx, user, params, body }) =>
        runAuthFx(
          Effect.flatMap(Rules, (rules) =>
            rules
              .update(user.userId, params.ruleId, body)
              .pipe(Effect.map((rule) => toRuleDto(rule))),
          ),
        ),
      {
        auth: { scopes: [CHANNEL_SCOPE.write] },
        params: standardRuleParameters,
        body: standardUpdate,
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardRule },
        detail: {
          summary: "Update a notification rule",
          operationId: NOTIFICATIONS_OPERATION_ID.updateRule,
          tags: [API_TAG.rules],
        },
      },
    )
    .delete(
      RULE_PATH.byId,
      ({ runAuthFx, user, params, set }) => {
        set.status = HTTP_STATUS.noContent
        return runAuthFx(
          Effect.flatMap(Rules, (rules) =>
            rules.remove(user.userId, params.ruleId).pipe(Effect.as(null)),
          ),
        )
      },
      {
        auth: { scopes: [CHANNEL_SCOPE.write] },
        params: standardRuleParameters,
        response: { ...FAILURES, [HTTP_STATUS.noContent]: standardNoContent },
        detail: {
          summary: "Delete a notification rule",
          operationId: NOTIFICATIONS_OPERATION_ID.deleteRule,
          tags: [API_TAG.rules],
        },
      },
    )

export const monitorRuleRoutes = (options: AuthPluginOptions<RuleServices>) =>
  new Elysia({
    name: RULE_PLUGIN.monitorRoutes,
    prefix: ROUTE.monitors,
    tags: [API_TAG.rules],
  }).use(monitorRuleHandlers(options))

export const ruleRoutes = (options: AuthPluginOptions<RuleServices>) =>
  new Elysia({
    name: RULE_PLUGIN.routes,
    prefix: ROUTE.rules,
    tags: [API_TAG.rules],
  }).use(ruleHandlers(options))
