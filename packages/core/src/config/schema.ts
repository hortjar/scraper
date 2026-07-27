import { Config, Option, Redacted } from "effect"

import { RETRY, TIMEOUT } from "../constants/defaults.js"
import { APP_ENV, AUTH_MODE, MAIL_DRIVER, STORAGE_DRIVER } from "../constants/domain-values.js"

import { blankToUndefined } from "./package-version.js"

const NO_SECRET = Redacted.make("")

const blankable = (name: string, fallback: string) =>
  Config.string(name).pipe(
    Config.map((value) => blankToUndefined(value) ?? fallback),
    Config.withDefault(fallback),
  )

const blankableSecret = (name: string) =>
  Config.string(name).pipe(
    Config.map((value) => Redacted.make(blankToUndefined(value) ?? "")),
    Config.withDefault(NO_SECRET),
  )

const csv = (name: string, fallback: readonly string[]) =>
  Config.string(name).pipe(
    Config.map((value) =>
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    ),
    Config.withDefault(fallback),
  )

export const appConfig = Config.all({
  env: Config.literal(
    APP_ENV.development,
    APP_ENV.test,
    APP_ENV.production,
  )("APP_ENV").pipe(Config.withDefault(APP_ENV.production)),
  appUrl: Config.string("APP_URL"),
  version: Config.string("APP_VERSION").pipe(Config.withDefault("0.0.0-dev")),
  gitSha: Config.string("GIT_SHA").pipe(Config.withDefault("local")),
  logLevel: Config.string("LOG_LEVEL").pipe(Config.withDefault("info")),
  logFormat: Config.literal("json", "pretty")("LOG_FORMAT").pipe(Config.withDefault("json")),
  defaultLocale: Config.string("DEFAULT_LOCALE").pipe(Config.withDefault("en")),
  supportedLocales: csv("SUPPORTED_LOCALES", ["en", "cs"]),
})

export const httpConfig = Config.all({
  port: Config.integer("API_PORT").pipe(Config.withDefault(9300)),
  host: Config.string("API_HOST").pipe(Config.withDefault("0.0.0.0")),
  corsOrigins: csv("CORS_ORIGINS", []),
  trustProxy: Config.boolean("TRUST_PROXY").pipe(Config.withDefault(true)),
  bodyLimitBytes: Config.integer("BODY_LIMIT_BYTES").pipe(Config.withDefault(1_048_576)),
  enableOpenapi: Config.boolean("ENABLE_OPENAPI").pipe(Config.withDefault(true)),
  enableBullBoard: Config.boolean("ENABLE_BULL_BOARD").pipe(Config.withDefault(false)),
  enableRegistration: Config.boolean("ENABLE_REGISTRATION").pipe(Config.withDefault(true)),
})

const encodedUserInfo = (user: string, password: string) =>
  `${encodeURIComponent(user)}:${encodeURIComponent(password)}@`

const postgresUrlFromParts = Config.all({
  host: Config.string("POSTGRES_HOST").pipe(Config.withDefault("postgres")),
  port: Config.integer("POSTGRES_PORT").pipe(Config.withDefault(5432)),
  user: Config.string("POSTGRES_USER").pipe(Config.withDefault("scraper")),
  database: Config.string("POSTGRES_DB").pipe(Config.withDefault("scraper")),
  password: Config.redacted("POSTGRES_PASSWORD"),
}).pipe(
  Config.map(({ database, host, password, port, user }) =>
    Redacted.make(
      `postgres://${encodedUserInfo(user, Redacted.value(password))}${host}:${String(port)}/${database}`,
    ),
  ),
)

const redisUrlFromParts = Config.all({
  host: Config.string("REDIS_HOST").pipe(Config.withDefault("redis")),
  port: Config.integer("REDIS_PORT").pipe(Config.withDefault(6379)),
  database: Config.integer("REDIS_DB").pipe(Config.withDefault(0)),
  password: Config.option(Config.redacted("REDIS_PASSWORD")),
}).pipe(
  Config.map(({ database, host, password, port }) =>
    Redacted.make(
      `redis://${Option.match(password, {
        onNone: () => "",
        onSome: (secret) => encodedUserInfo("", Redacted.value(secret)),
      })}${host}:${String(port)}/${String(database)}`,
    ),
  ),
)

export const databaseConfig = Config.all({
  url: Config.redacted("DATABASE_URL").pipe(Config.orElse(() => postgresUrlFromParts)),
  poolMax: Config.integer("DATABASE_POOL_MAX").pipe(Config.withDefault(10)),
  poolIdleTimeout: Config.integer("DATABASE_POOL_IDLE_TIMEOUT").pipe(Config.withDefault(30)),
  ssl: Config.boolean("DATABASE_SSL").pipe(Config.withDefault(false)),
  runMigrationsOnBoot: Config.boolean("RUN_MIGRATIONS_ON_BOOT").pipe(Config.withDefault(true)),
})

export const redisConfig = Config.all({
  url: Config.redacted("REDIS_URL").pipe(Config.orElse(() => redisUrlFromParts)),
  jobPrefix: Config.string("JOB_PREFIX").pipe(Config.withDefault("scraper")),
  workerConcurrency: Config.integer("WORKER_CONCURRENCY").pipe(Config.withDefault(5)),
  notifyConcurrency: Config.integer("NOTIFY_CONCURRENCY").pipe(Config.withDefault(20)),
  scrapeMaxAttempts: Config.integer("SCRAPE_MAX_ATTEMPTS").pipe(
    Config.withDefault(RETRY.scrapeAttempts),
  ),
  backoffBaseMs: Config.integer("JOB_BACKOFF_BASE_MS").pipe(
    Config.withDefault(RETRY.backoffBaseMs),
  ),
})

export const securityConfig = Config.all({
  encryptionKey: Config.redacted("ENCRYPTION_KEY"),
  sessionSecret: Config.redacted("SESSION_SECRET"),
  sessionTtlSeconds: Config.integer("SESSION_TTL_SECONDS").pipe(Config.withDefault(604_800)),
  sessionAbsoluteTtlSeconds: Config.integer("SESSION_ABSOLUTE_TTL_SECONDS").pipe(
    Config.withDefault(2_592_000),
  ),
  sessionCookieName: Config.string("SESSION_COOKIE_NAME").pipe(Config.withDefault("sid")),
  argon2MemoryKib: Config.integer("ARGON2_MEMORY_KIB").pipe(Config.withDefault(19_456)),
  argon2TimeCost: Config.integer("ARGON2_TIME_COST").pipe(Config.withDefault(2)),
  passwordBreachCheck: Config.boolean("PASSWORD_BREACH_CHECK").pipe(Config.withDefault(false)),
  rateLimitEnabled: Config.boolean("RATE_LIMIT_ENABLED").pipe(Config.withDefault(true)),
})

export const authConfig = Config.all({
  mode: blankable("AUTH_MODE", AUTH_MODE.local).pipe(
    Config.map((value) => (value === AUTH_MODE.universal ? AUTH_MODE.universal : AUTH_MODE.local)),
  ),
  universalUrl: blankable("UNIVERSAL_AUTH_URL", ""),
  universalIssuer: blankable("UNIVERSAL_AUTH_ISSUER", ""),
  universalApp: blankable("UNIVERSAL_AUTH_APP", "scraper"),
  universalApiKey: blankableSecret("UNIVERSAL_AUTH_API_KEY"),
  adminEmail: blankable("ADMIN_EMAIL", ""),
  adminPassword: blankableSecret("ADMIN_PASSWORD"),
}).pipe(
  Config.map((auth) => ({
    ...auth,
    issuer: auth.universalIssuer === "" ? auth.universalUrl : auth.universalIssuer,
  })),
)

export const scrapingConfig = Config.all({
  minIntervalSeconds: Config.integer("MIN_SCRAPE_INTERVAL_SECONDS").pipe(Config.withDefault(300)),
  maxMonitorsPerUser: Config.integer("MAX_MONITORS_PER_USER").pipe(Config.withDefault(100)),
  maxConcurrentRunsPerUser: Config.integer("MAX_CONCURRENT_RUNS_PER_USER").pipe(
    Config.withDefault(5),
  ),
  timeoutMs: Config.integer("SCRAPE_TIMEOUT_MS").pipe(Config.withDefault(TIMEOUT.httpScrapeMs)),
  maxBytes: Config.integer("SCRAPE_MAX_BYTES").pipe(Config.withDefault(10_485_760)),
  userAgent: Config.string("SCRAPE_USER_AGENT").pipe(Config.withDefault("ScraperBot/1.0")),
  respectRobots: Config.boolean("RESPECT_ROBOTS_TXT").pipe(Config.withDefault(true)),
  allowRobotsOverride: Config.boolean("ALLOW_ROBOTS_OVERRIDE").pipe(Config.withDefault(false)),
  domainRateLimitPerMinute: Config.integer("DOMAIN_RATE_LIMIT_PER_MINUTE").pipe(
    Config.withDefault(6),
  ),
  autoPauseAfterFailures: Config.integer("AUTO_PAUSE_AFTER_FAILURES").pipe(Config.withDefault(20)),
  blockedHostPatterns: csv("BLOCKED_HOST_PATTERNS", []),
})

export const browserConfig = Config.all({
  wsEndpoint: Config.string("BROWSER_WS_ENDPOINT").pipe(Config.withDefault("")),
  token: Config.redacted("BROWSER_TOKEN").pipe(Config.withDefault(NO_SECRET)),
  timeoutMs: Config.integer("BROWSER_TIMEOUT_MS").pipe(Config.withDefault(TIMEOUT.browserScrapeMs)),
  maxContexts: Config.integer("BROWSER_MAX_CONTEXTS").pipe(Config.withDefault(4)),
  blockResources: csv("BROWSER_BLOCK_RESOURCES", ["image", "media", "font"]),
  screenshotsEnabled: Config.boolean("SCREENSHOTS_ENABLED").pipe(Config.withDefault(true)),
})

export const storageConfig = Config.all({
  driver: Config.literal(
    STORAGE_DRIVER.local,
    STORAGE_DRIVER.s3,
  )("STORAGE_DRIVER").pipe(Config.withDefault(STORAGE_DRIVER.local)),
  localPath: Config.string("STORAGE_LOCAL_PATH").pipe(Config.withDefault("/data/snapshots")),
  s3Endpoint: Config.string("S3_ENDPOINT").pipe(Config.withDefault("")),
  s3Bucket: Config.string("S3_BUCKET").pipe(Config.withDefault("")),
  s3Region: Config.string("S3_REGION").pipe(Config.withDefault("")),
  s3AccessKeyId: Config.redacted("S3_ACCESS_KEY_ID").pipe(Config.withDefault(NO_SECRET)),
  s3SecretAccessKey: Config.redacted("S3_SECRET_ACCESS_KEY").pipe(Config.withDefault(NO_SECRET)),
  runRetentionDays: Config.integer("RUN_RETENTION_DAYS").pipe(Config.withDefault(90)),
  snapshotRetentionDays: Config.integer("SNAPSHOT_RETENTION_DAYS").pipe(Config.withDefault(30)),
  screenshotRetentionDays: Config.integer("SCREENSHOT_RETENTION_DAYS").pipe(Config.withDefault(14)),
})

interface MailTransport {
  readonly driver: (typeof MAIL_DRIVER)[keyof typeof MAIL_DRIVER]
  readonly from: string
  readonly smtpHost: string
  readonly resendApiKey: Redacted.Redacted
}

const isMailTransportConfigured = ({
  driver,
  from,
  resendApiKey,
  smtpHost,
}: MailTransport): boolean => {
  if (from.trim() === "") return false
  if (driver === MAIL_DRIVER.smtp) return smtpHost.trim() !== ""
  if (driver === MAIL_DRIVER.resend) return Redacted.value(resendApiKey).trim() !== ""
  return true
}

export const mailConfig = Config.all({
  driver: Config.literal(
    MAIL_DRIVER.smtp,
    MAIL_DRIVER.resend,
    MAIL_DRIVER.console,
  )("MAIL_DRIVER").pipe(Config.withDefault(MAIL_DRIVER.smtp)),
  from: Config.string("MAIL_FROM").pipe(Config.withDefault("")),
  smtpHost: Config.string("SMTP_HOST").pipe(Config.withDefault("")),
  smtpPort: Config.integer("SMTP_PORT").pipe(Config.withDefault(587)),
  smtpUser: Config.string("SMTP_USER").pipe(Config.withDefault("")),
  smtpPassword: Config.redacted("SMTP_PASSWORD").pipe(Config.withDefault(NO_SECRET)),
  smtpSecure: Config.boolean("SMTP_SECURE").pipe(Config.withDefault(true)),
  resendApiKey: Config.redacted("RESEND_API_KEY").pipe(Config.withDefault(NO_SECRET)),
  channelFailureLimit: Config.integer("CHANNEL_FAILURE_LIMIT").pipe(Config.withDefault(10)),
}).pipe(Config.map((mail) => ({ ...mail, isAvailable: isMailTransportConfigured(mail) })))

export const observabilityConfig = Config.all({
  otelEndpoint: Config.string("OTEL_EXPORTER_OTLP_ENDPOINT").pipe(Config.withDefault("")),
  otelServiceName: Config.string("OTEL_SERVICE_NAME").pipe(Config.withDefault("scraper-api")),
  metricsEnabled: Config.boolean("METRICS_ENABLED").pipe(Config.withDefault(true)),
  sentryDsn: Config.redacted("SENTRY_DSN").pipe(Config.withDefault(NO_SECRET)),
})

export const rootConfig = Config.all({
  app: appConfig,
  http: httpConfig,
  database: databaseConfig,
  redis: redisConfig,
  security: securityConfig,
  auth: authConfig,
  scraping: scrapingConfig,
  browser: browserConfig,
  storage: storageConfig,
  mail: mailConfig,
  observability: observabilityConfig,
})

export type RootConfig = Config.Config.Success<typeof rootConfig>
