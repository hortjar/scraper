import type { NotificationRule } from "@scraper/core/domain"

import type { RuleDto } from "./rules.schema.js"

const iso = (value: Date): string => value.toISOString()

export const toRuleDto = (rule: NotificationRule): RuleDto => ({
  id: rule.id,
  monitorId: rule.monitorId,
  channelId: rule.channelId,
  name: rule.name,
  trigger: rule.trigger,
  extractorKey: rule.extractorKey,
  deliveryMode: rule.deliveryMode,
  digestCron: rule.digestCron,
  throttleSeconds: rule.throttleSeconds,
  quietHours: rule.quietHours,
  template: rule.template,
  enabled: rule.enabled,
  createdAt: iso(rule.createdAt),
  updatedAt: iso(rule.updatedAt),
})
