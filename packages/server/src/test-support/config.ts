import { ConfigProvider, Effect } from "effect"

const BASE_ENV: Readonly<Record<string, string>> = {
  APP_URL: "http://localhost:9300",
  POSTGRES_PASSWORD: "test-password",
  ENCRYPTION_KEY: "dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcyEh",
  SESSION_SECRET: "test-session-secret",
  BROWSER_TOKEN: "test-browser-token",
}

export const testConfigProvider = (
  overrides: Readonly<Record<string, string>> = {},
): ConfigProvider.ConfigProvider =>
  ConfigProvider.fromMap(new Map(Object.entries({ ...BASE_ENV, ...overrides })))

export const withTestConfig =
  (overrides: Readonly<Record<string, string>> = {}) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.withConfigProvider(testConfigProvider(overrides))(effect)
