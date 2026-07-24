export const CHANNEL_KIND = {
  email: "email",
  webhook: "webhook",
  slack: "slack",
  discord: "discord",
  telegram: "telegram",
} as const

export const NOTIFICATION_EVENT = {
  change: "change",
  digest: "digest",
  runFailed: "run_failed",
  runRecovered: "run_recovered",
  monitorPaused: "monitor_paused",
  test: "test",
} as const

export const SUPPRESSION_REASON = {
  throttled: "throttled",
  quietHours: "quiet_hours",
  duplicate: "duplicate",
  channelDisabled: "channel_disabled",
  channelUnverified: "channel_unverified",
  belowThreshold: "below_threshold",
  digestPending: "digest_pending",
} as const

