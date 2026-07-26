import { NOTIFICATION_EVENT } from "@scraper/core/constants"
import { MonitorId, newId, RuleId, RunId, UserId } from "@scraper/core/domain"
import type { NotificationMessage } from "@scraper/core/domain"

import type { ChannelPayload } from "../notifications.types.js"

export const sampleUserId = (): UserId => newId(UserId)
export const sampleMonitorId = (): MonitorId => newId(MonitorId)
export const sampleRuleId = (): RuleId => newId(RuleId)
export const sampleRunId = (): RunId => newId(RunId)

export const sampleMessage = (
  overrides: Partial<NotificationMessage> = {},
): NotificationMessage => ({
  event: NOTIFICATION_EVENT.change,
  locale: "en",
  monitor: {
    id: sampleMonitorId(),
    name: "Competitor pricing",
    url: "https://example.com/pricing",
  },
  rule: { id: sampleRuleId(), name: "Price drops" },
  changes: [
    {
      key: null,
      label: "Price",
      changeKind: "decreased",
      oldValue: "129.00",
      newValue: "99.00",
      deltaAbsolute: -30,
      deltaPercent: -23.26,
    },
  ],
  run: {
    id: sampleRunId(),
    at: new Date("2026-07-24T09:00:00Z"),
    durationMs: 812,
    strategy: "http",
  },
  links: {
    monitor: "https://app.example.com/monitors/1",
    run: "https://app.example.com/runs/1",
    unsubscribe: "https://app.example.com/settings/notifications",
  },
  screenshotRef: null,
  ...overrides,
})

export const samplePayload = (overrides: Partial<ChannelPayload> = {}): ChannelPayload => ({
  title: "Competitor pricing changed",
  summaryText: "Price: 129.00 → 99.00",
  summaryMarkdown: "**Price**: 129.00 → 99.00",
  fields: [{ label: "Price", value: "129.00 → 99.00" }],
  url: "https://app.example.com/runs/1",
  ...overrides,
})
