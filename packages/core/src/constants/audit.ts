export const AUDIT_ACTION = {
  userRegistered: "user.registered",
  userLoggedIn: "user.logged_in",
  userLoginFailed: "user.login_failed",
  userLoggedOut: "user.logged_out",
  userEmailVerified: "user.email_verified",
  userPasswordChanged: "user.password_changed",
  userPasswordReset: "user.password_reset",
  sessionRevoked: "session.revoked",
  sessionsRevokedAll: "session.revoked_all",
  apiKeyCreated: "api_key.created",
  apiKeyRevoked: "api_key.revoked",
  monitorCreated: "monitor.created",
  monitorUpdated: "monitor.updated",
  monitorDeleted: "monitor.deleted",
  monitorPaused: "monitor.paused",
  monitorResumed: "monitor.resumed",
  robotsOverridden: "monitor.robots_overridden",
  channelCreated: "channel.created",
  channelUpdated: "channel.updated",
  channelDeleted: "channel.deleted",
  channelDisabled: "channel.auto_disabled",
  ruleCreated: "rule.created",
  ruleUpdated: "rule.updated",
  ruleDeleted: "rule.deleted",
} as const

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION]

export const ACTOR_KIND = {
  user: "user",
  system: "system",
  apiKey: "api_key",
} as const

export type ActorKind = (typeof ACTOR_KIND)[keyof typeof ACTOR_KIND]
