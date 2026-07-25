import { Schema } from "effect"

import { API_KEY_SCOPE, USER_ROLE, USER_STATUS } from "../constants/domain-values.js"

import { ApiKeyId, SessionId, UserId } from "./ids.js"
import { Email, Locale, NonEmptyString, NonNegativeInt, Timezone } from "./primitives.js"

export const UserRole = Schema.Literal(USER_ROLE.user, USER_ROLE.admin)
export type UserRole = typeof UserRole.Type

export const UserStatus = Schema.Literal(USER_STATUS.active, USER_STATUS.suspended)
export type UserStatus = typeof UserStatus.Type

export const PlanLimits = Schema.Struct({
  maxMonitors: NonNegativeInt,
  minIntervalSeconds: NonNegativeInt,
  maxChannels: NonNegativeInt,
})
export type PlanLimits = typeof PlanLimits.Type

export const User = Schema.Struct({
  id: UserId,
  email: Email,
  emailVerifiedAt: Schema.NullOr(Schema.DateFromSelf),
  displayName: Schema.NullOr(NonEmptyString),
  timezone: Timezone,
  locale: Locale,
  role: UserRole,
  status: UserStatus,
  planLimits: PlanLimits,
  createdAt: Schema.DateFromSelf,
  updatedAt: Schema.DateFromSelf,
})
export type User = typeof User.Type

export const Session = Schema.Struct({
  id: SessionId,
  userId: UserId,
  expiresAt: Schema.DateFromSelf,
  lastSeenAt: Schema.DateFromSelf,
  userAgent: Schema.NullOr(Schema.String),
  ip: Schema.NullOr(Schema.String),
  revokedAt: Schema.NullOr(Schema.DateFromSelf),
  createdAt: Schema.DateFromSelf,
})
export type Session = typeof Session.Type

export const ApiKeyScope = Schema.Literal(
  API_KEY_SCOPE.monitorsRead,
  API_KEY_SCOPE.monitorsWrite,
  API_KEY_SCOPE.runsRead,
  API_KEY_SCOPE.channelsWrite,
)
export type ApiKeyScope = typeof ApiKeyScope.Type

export const ApiKey = Schema.Struct({
  id: ApiKeyId,
  userId: UserId,
  name: NonEmptyString,
  prefix: Schema.String,
  scopes: Schema.Array(ApiKeyScope),
  lastUsedAt: Schema.NullOr(Schema.DateFromSelf),
  expiresAt: Schema.NullOr(Schema.DateFromSelf),
  revokedAt: Schema.NullOr(Schema.DateFromSelf),
  createdAt: Schema.DateFromSelf,
})
export type ApiKey = typeof ApiKey.Type

export const Actor = Schema.Struct({
  userId: UserId,
  role: UserRole,
  locale: Locale,
  timezone: Timezone,
  scopes: Schema.Array(ApiKeyScope),
})
export type Actor = typeof Actor.Type
