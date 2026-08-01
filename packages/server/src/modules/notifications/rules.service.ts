import { AppConfig } from "@scraper/core/config"
import { SERVICE_TAG, SPAN } from "@scraper/core/constants"
import type { MonitorId, RuleId, UserId } from "@scraper/core/domain"
import { ChannelNotFound, MonitorNotFound } from "@scraper/core/errors"
import { resolveLocale } from "@scraper/core/i18n"
import { Database } from "@scraper/db"
import { Effect, Option } from "effect"

import { ChannelRepository, ChannelRepositoryLive } from "./channel.repository.js"
import { ChannelRegistry, ChannelRegistryLive } from "./channels/index.js"
import type { RuleInsert, RulePatch } from "./rule.repository.crud.js"
import { RuleRepository, RuleRepositoryLive } from "./rule.repository.js"
import { makePreviewMessageBuilder } from "./rules.preview.js"
import type { CreateRuleBody, UpdateRuleBody } from "./rules.schema.js"
import { TemplateRenderer, TemplateRendererLive } from "./template/template-renderer.service.js"

type RuleColumns = Omit<RuleInsert, "monitorId">

const columnsFrom = (body: CreateRuleBody): RuleColumns => ({
  channelId: body.channelId,
  name: body.name,
  triggerKind: body.trigger.kind,
  triggerConfig: body.trigger,
  extractorKey: body.extractorKey,
  deliveryMode: body.deliveryMode,
  digestCron: body.digestCron,
  throttleSeconds: body.throttleSeconds,
  quietHours: body.quietHours,
  template: body.template,
  enabled: body.enabled,
})

const patchFrom = (body: UpdateRuleBody): RulePatch => ({
  ...(body.channelId !== undefined && { channelId: body.channelId }),
  ...(body.name !== undefined && { name: body.name }),
  ...(body.trigger !== undefined && {
    triggerKind: body.trigger.kind,
    triggerConfig: body.trigger,
  }),
  ...(body.extractorKey !== undefined && { extractorKey: body.extractorKey }),
  ...(body.deliveryMode !== undefined && { deliveryMode: body.deliveryMode }),
  ...(body.digestCron !== undefined && { digestCron: body.digestCron }),
  ...(body.throttleSeconds !== undefined && { throttleSeconds: body.throttleSeconds }),
  ...(body.quietHours !== undefined && { quietHours: body.quietHours }),
  ...(body.template !== undefined && { template: body.template }),
  ...(body.enabled !== undefined && { enabled: body.enabled }),
})

export class Rules extends Effect.Service<Rules>()(SERVICE_TAG.Rules, {
  effect: Effect.gen(function* () {
    const rules = yield* RuleRepository
    const channels = yield* ChannelRepository
    const registry = yield* ChannelRegistry
    const renderer = yield* TemplateRenderer
    const database = yield* Database
    const config = yield* AppConfig

    const buildPreviewMessage = makePreviewMessageBuilder(
      database,
      config.app.appUrl,
      config.app.defaultLocale,
    )

    const list = Effect.fn(SPAN.rules.list)(function* (userId: UserId, monitorId: MonitorId) {
      return yield* rules.listForMonitor(userId, monitorId)
    })

    const create = Effect.fn(SPAN.rules.create)(function* (
      userId: UserId,
      monitorId: MonitorId,
      body: CreateRuleBody,
    ) {
      const isOwned = yield* rules.ownsMonitor(userId, monitorId)
      if (!isOwned) return yield* Effect.fail(new MonitorNotFound({ id: monitorId }))
      yield* channels.findById(userId, body.channelId)
      return yield* rules.insert({ monitorId, ...columnsFrom(body) })
    })

    const update = Effect.fn(SPAN.rules.update)(function* (
      userId: UserId,
      ruleId: RuleId,
      body: UpdateRuleBody,
    ) {
      if (body.channelId !== undefined) yield* channels.findById(userId, body.channelId)
      return yield* rules.update(userId, ruleId, patchFrom(body))
    })

    const remove = Effect.fn(SPAN.rules.remove)(function* (userId: UserId, ruleId: RuleId) {
      yield* rules.remove(userId, ruleId)
    })

    const preview = Effect.fn(SPAN.notifications.render)(function* (
      userId: UserId,
      ruleId: RuleId,
    ) {
      const rule = yield* rules.findById(userId, ruleId)
      const channel = yield* channels.findById(userId, rule.channelId)

      const descriptor = registry.get(channel.kind)
      if (Option.isNone(descriptor)) {
        return yield* Effect.fail(new ChannelNotFound({ id: rule.channelId }))
      }

      const built = yield* buildPreviewMessage({
        monitorId: rule.monitorId,
        ruleId: rule.id,
        ruleName: rule.name,
      })
      if (built === null) return yield* Effect.fail(new MonitorNotFound({ id: rule.monitorId }))

      const payload = yield* renderer.render(
        built.message,
        resolveLocale(built.message.locale, null, config.app.defaultLocale),
        descriptor.value.capabilities,
        rule.template,
      )

      return {
        ruleId: rule.id,
        channelKind: channel.kind,
        basedOnRunId: built.basedOnRunId,
        payload,
      }
    })

    return { list, create, update, remove, preview } as const
  }),
  dependencies: [
    RuleRepositoryLive,
    ChannelRepositoryLive,
    ChannelRegistryLive,
    TemplateRendererLive,
    Database.Default,
    AppConfig.Default,
  ],
}) {}

export const RulesLive = Rules.Default

export { type NotificationRule } from "@scraper/core/domain"
