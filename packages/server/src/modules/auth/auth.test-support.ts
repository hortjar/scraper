import type { RootConfig } from "@scraper/core/config"
import { AppConfig, rootConfig } from "@scraper/core/config"
import { APP_ENV, USER_ROLE, USER_STATUS } from "@scraper/core/constants"
import type { Email, Timezone, UserId } from "@scraper/core/domain"
import { ConfigProvider, Effect, Layer } from "effect"

import { DEFAULT_TIMEZONE } from "./auth.constants.js"
import type { UserRecord } from "./users/user.repository.js"

const BASE_ENVIRONMENT: readonly (readonly [string, string])[] = [
  ["APP_ENV", APP_ENV.test],
  ["APP_URL", "http://localhost:9301"],
  ["ENCRYPTION_KEY", "test-encryption-key"],
  ["SESSION_SECRET", "test-session-secret"],
  ["POSTGRES_PASSWORD", "test-postgres-password"],
  ["ARGON2_MEMORY_KIB", "8192"],
  ["ARGON2_TIME_COST", "1"],
]

export const testConfigProvider = (overrides: Readonly<Record<string, string>> = {}) =>
  ConfigProvider.fromMap(new Map([...BASE_ENVIRONMENT, ...Object.entries(overrides)]))

export const testConfig = (
  overrides: Readonly<Record<string, string>> = {},
): Effect.Effect<RootConfig> =>
  rootConfig.pipe(Effect.withConfigProvider(testConfigProvider(overrides)), Effect.orDie)

export const testAppConfigLayer = (overrides: Readonly<Record<string, string>> = {}) =>
  Layer.effect(AppConfig, testConfig(overrides) as Effect.Effect<AppConfig>)

export const TEST_USER_ID = "018f0000-0000-7000-8000-000000000001" as UserId

export const testUser = (overrides: Partial<UserRecord> = {}): UserRecord => ({
  id: TEST_USER_ID,
  email: "person@example.com" as Email,
  emailVerifiedAt: null,
  displayName: null,
  timezone: DEFAULT_TIMEZONE as Timezone,
  locale: "en",
  role: USER_ROLE.user,
  status: USER_STATUS.active,
  planLimits: { maxMonitors: 10, minIntervalSeconds: 300, maxChannels: 5 },
  passwordHash: "$argon2id$v=19$m=8192,t=1,p=1$c2FsdHNhbHQ$aGFzaGhhc2g",
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...overrides,
})
