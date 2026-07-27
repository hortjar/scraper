import { API_TAG, HEADER, HTTP_STATUS, ROUTE } from "@scraper/core/constants"
import { resolveLocale } from "@scraper/core/i18n"
import { Effect, Schema } from "effect"
import { Elysia } from "elysia"

import type { AuthPluginOptions } from "../auth/index.js"
import { authBase, FAILURES, requireUser, standardNoContent } from "../auth/index.js"

import { CHANNEL_PATH, CHANNEL_PLUGIN, CHANNEL_SCOPE } from "./channels.constants.js"
import { toChannelDto } from "./channels.dto.js"
import {
  ChannelIdParameters,
  ChannelKindListDto,
  ChannelListDto,
  ChannelTestDto,
  CreateChannelBody,
  ChannelDto,
  UpdateChannelBody,
} from "./channels.schema.js"
import { Channels } from "./channels.service.js"
import { NOTIFICATIONS_OPERATION_ID } from "./notifications.constants.js"

const standardCreate = Schema.standardSchemaV1(CreateChannelBody)
const standardUpdate = Schema.standardSchemaV1(UpdateChannelBody)
const standardParameters = Schema.standardSchemaV1(ChannelIdParameters)
const standardChannel = Schema.standardSchemaV1(ChannelDto)
const standardList = Schema.standardSchemaV1(ChannelListDto)
const standardKinds = Schema.standardSchemaV1(ChannelKindListDto)
const standardTest = Schema.standardSchemaV1(ChannelTestDto)

export type ChannelServices = Channels

const channelHandlers = (options: AuthPluginOptions<ChannelServices>) =>
  authBase<ChannelServices>(options, CHANNEL_PLUGIN.handlers)
    .use(requireUser(options))
    .get(
      CHANNEL_PATH.kinds,
      ({ runAuthFx, headers }) =>
        runAuthFx(
          Effect.flatMap(Channels, (channels) =>
            channels
              .listKinds(
                resolveLocale(
                  null,
                  headers[HEADER.acceptLanguage] ?? null,
                  options.config.app.defaultLocale,
                ),
              )
              .pipe(Effect.map((items) => ({ items }))),
          ),
        ),
      {
        auth: { scopes: [CHANNEL_SCOPE.read] },
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardKinds },
        detail: {
          summary: "List the channel types this instance supports",
          operationId: NOTIFICATIONS_OPERATION_ID.listChannelKinds,
          tags: [API_TAG.channels],
        },
      },
    )
    .get(
      CHANNEL_PATH.root,
      ({ runAuthFx, user }) =>
        runAuthFx(
          Effect.flatMap(Channels, (channels) =>
            channels
              .list(user.userId)
              .pipe(Effect.map((items) => ({ items: items.map((item) => toChannelDto(item)) }))),
          ),
        ),
      {
        auth: { scopes: [CHANNEL_SCOPE.read] },
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardList },
        detail: {
          summary: "List notification channels",
          operationId: NOTIFICATIONS_OPERATION_ID.listChannels,
          tags: [API_TAG.channels],
        },
      },
    )
    .post(
      CHANNEL_PATH.root,
      ({ runAuthFx, user, body, set }) => {
        set.status = HTTP_STATUS.created
        return runAuthFx(
          Effect.flatMap(Channels, (channels) =>
            channels.create(user.userId, body).pipe(Effect.map((channel) => toChannelDto(channel))),
          ),
        )
      },
      {
        auth: { scopes: [CHANNEL_SCOPE.write] },
        body: standardCreate,
        response: { ...FAILURES, [HTTP_STATUS.created]: standardChannel },
        detail: {
          summary: "Create a notification channel",
          operationId: NOTIFICATIONS_OPERATION_ID.createChannel,
          tags: [API_TAG.channels],
        },
      },
    )
    .patch(
      CHANNEL_PATH.byId,
      ({ runAuthFx, user, params, body }) =>
        runAuthFx(
          Effect.flatMap(Channels, (channels) =>
            channels
              .update(user.userId, params.channelId, body)
              .pipe(Effect.map((channel) => toChannelDto(channel))),
          ),
        ),
      {
        auth: { scopes: [CHANNEL_SCOPE.write] },
        params: standardParameters,
        body: standardUpdate,
        response: { ...FAILURES, [HTTP_STATUS.ok]: standardChannel },
        detail: {
          summary: "Update a notification channel",
          operationId: NOTIFICATIONS_OPERATION_ID.updateChannel,
          tags: [API_TAG.channels],
        },
      },
    )
    .delete(
      CHANNEL_PATH.byId,
      ({ runAuthFx, user, params, set }) => {
        set.status = HTTP_STATUS.noContent
        return runAuthFx(
          Effect.flatMap(Channels, (channels) =>
            channels.remove(user.userId, params.channelId).pipe(Effect.as(null)),
          ),
        )
      },
      {
        auth: { scopes: [CHANNEL_SCOPE.write] },
        params: standardParameters,
        response: { ...FAILURES, [HTTP_STATUS.noContent]: standardNoContent },
        detail: {
          summary: "Delete a notification channel",
          operationId: NOTIFICATIONS_OPERATION_ID.deleteChannel,
          tags: [API_TAG.channels],
        },
      },
    )
    .post(
      CHANNEL_PATH.test,
      ({ runAuthFx, user, params, set }) => {
        set.status = HTTP_STATUS.accepted
        return runAuthFx(
          Effect.flatMap(Channels, (channels) =>
            channels.test(user.userId, params.channelId).pipe(
              Effect.map((testedAt) => ({
                channelId: params.channelId,
                verified: true,
                testedAt: testedAt.toISOString(),
              })),
            ),
          ),
        )
      },
      {
        auth: { scopes: [CHANNEL_SCOPE.write] },
        params: standardParameters,
        response: { ...FAILURES, [HTTP_STATUS.accepted]: standardTest },
        detail: {
          summary: "Send a verification message to a channel",
          operationId: NOTIFICATIONS_OPERATION_ID.testChannel,
          tags: [API_TAG.channels],
        },
      },
    )

export const channelRoutes = (options: AuthPluginOptions<ChannelServices>) =>
  new Elysia({
    name: CHANNEL_PLUGIN.routes,
    prefix: ROUTE.channels,
    tags: [API_TAG.channels],
  }).use(channelHandlers(options))
