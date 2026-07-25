export interface EnvVar {
  readonly name: string
  readonly group: string
  readonly required: boolean
  readonly secret: boolean
  readonly defaultValue: string | null
  readonly description: string
}

const group = (name: string, vars: readonly Omit<EnvVar, "group">[]): readonly EnvVar[] =>
  vars.map((entry) => ({ ...entry, group: name }))

const optional = (
  name: string,
  defaultValue: string,
  description: string,
  secret = false,
): Omit<EnvVar, "group"> => ({ name, required: false, secret, defaultValue, description })

const required = (name: string, description: string, secret = false): Omit<EnvVar, "group"> => ({
  name,
  required: true,
  secret,
  defaultValue: null,
  description,
})

export const ENV_SPEC: readonly EnvVar[] = [
  ...group("Core", [
    optional("APP_ENV", "production", "development | test | production"),
    required("APP_URL", "Public URL, used in emails, links and origin checks"),
    optional("APP_VERSION", "0.0.0-dev", "Baked at build time, reported by /health"),
    optional("GIT_SHA", "local", "Baked at build time, shown next to the version"),
    optional("LOG_LEVEL", "info", "trace | debug | info | warn | error | fatal"),
    optional("LOG_FORMAT", "json", "json | pretty"),
    optional("DEFAULT_LOCALE", "en", "Fallback locale"),
    optional("SUPPORTED_LOCALES", "en,cs", "Comma separated locale list"),
  ]),
  ...group("API", [
    optional("API_PORT", "3001", "HTTP port"),
    optional("API_HOST", "0.0.0.0", "Bind address"),
    optional("CORS_ORIGINS", "", "Comma separated. Empty means same origin only"),
    optional("TRUST_PROXY", "true", "Read X-Forwarded-For for rate limiting"),
    optional("BODY_LIMIT_BYTES", "1048576", "Maximum request body size"),
    optional("ENABLE_OPENAPI", "true", "Serve Swagger UI and the OpenAPI document"),
    optional("ENABLE_BULL_BOARD", "false", "Admin queue dashboard"),
    optional("ENABLE_REGISTRATION", "true", "Turn off for a private instance"),
  ]),
  ...group("Database", [
    required("DATABASE_URL", "postgres://user:pass@postgres:5432/scraper", true),
    optional("DATABASE_POOL_MAX", "10", "Connections per process"),
    optional("DATABASE_POOL_IDLE_TIMEOUT", "30", "Seconds before an idle connection closes"),
    optional("DATABASE_SSL", "false", "Enable for managed Postgres"),
    optional("RUN_MIGRATIONS_ON_BOOT", "true", "API applies migrations under an advisory lock"),
  ]),
  ...group("Redis and queues", [
    required("REDIS_URL", "redis://redis:6379/0", true),
    optional("JOB_PREFIX", "scraper", "Namespace so environments can share Redis"),
    optional("WORKER_CONCURRENCY", "5", "Simultaneous scrapes per worker replica"),
    optional("NOTIFY_CONCURRENCY", "20", "Simultaneous notification sends"),
    optional("SCRAPE_MAX_ATTEMPTS", "3", "Retries before a scrape job is abandoned"),
    optional("JOB_BACKOFF_BASE_MS", "30000", "Exponential backoff base"),
  ]),
  ...group("Security", [
    required("ENCRYPTION_KEY", "32 bytes base64, encrypts channel secrets", true),
    required("SESSION_SECRET", "32 bytes base64, signs session cookies", true),
    optional("SESSION_TTL_SECONDS", "604800", "Sliding session lifetime"),
    optional("SESSION_ABSOLUTE_TTL_SECONDS", "2592000", "Hard session cap"),
    optional("SESSION_COOKIE_NAME", "sid", "Session cookie name"),
    optional("ARGON2_MEMORY_KIB", "19456", "Argon2id memory cost"),
    optional("ARGON2_TIME_COST", "2", "Argon2id time cost"),
    optional("PASSWORD_BREACH_CHECK", "false", "Check passwords against HIBP ranges"),
    optional("RATE_LIMIT_ENABLED", "true", "Enable request rate limiting"),
  ]),
  ...group("Scraping", [
    optional("MIN_SCRAPE_INTERVAL_SECONDS", "300", "Floor for user schedules"),
    optional("MAX_MONITORS_PER_USER", "100", "Per user monitor cap"),
    optional("MAX_CONCURRENT_RUNS_PER_USER", "5", "Fair scheduling cap"),
    optional("SCRAPE_TIMEOUT_MS", "30000", "HTTP strategy timeout"),
    optional("SCRAPE_MAX_BYTES", "10485760", "Response body cap"),
    optional("SCRAPE_USER_AGENT", "ScraperBot/1.0", "Identify the crawler"),
    optional("RESPECT_ROBOTS_TXT", "true", "Honour robots.txt"),
    optional("ALLOW_ROBOTS_OVERRIDE", "false", "Allow per monitor robots override"),
    optional("DOMAIN_RATE_LIMIT_PER_MINUTE", "6", "Requests per target host per minute"),
    optional("AUTO_PAUSE_AFTER_FAILURES", "20", "Consecutive failures before auto pause"),
    optional("BLOCKED_HOST_PATTERNS", "", "Extra SSRF denylist, comma separated"),
  ]),
  ...group("Browser", [
    optional("BROWSER_WS_ENDPOINT", "", "ws://browser:3000, empty launches locally"),
    optional("BROWSER_TIMEOUT_MS", "45000", "Browser strategy timeout"),
    optional("BROWSER_MAX_CONTEXTS", "4", "Concurrent contexts per worker"),
    optional("BROWSER_BLOCK_RESOURCES", "image,media,font", "Resource types to block"),
    optional("SCREENSHOTS_ENABLED", "true", "Capture screenshots on browser runs"),
  ]),
  ...group("Storage", [
    optional("STORAGE_DRIVER", "local", "local | s3"),
    optional("STORAGE_LOCAL_PATH", "/data/snapshots", "Must be a mounted volume"),
    optional("S3_ENDPOINT", "", "S3 compatible endpoint"),
    optional("S3_BUCKET", "", "Bucket name"),
    optional("S3_REGION", "", "Bucket region"),
    optional("S3_ACCESS_KEY_ID", "", "S3 access key", true),
    optional("S3_SECRET_ACCESS_KEY", "", "S3 secret key", true),
    optional("RUN_RETENTION_DAYS", "90", "Run history retention"),
    optional("SNAPSHOT_RETENTION_DAYS", "30", "Snapshot retention"),
    optional("SCREENSHOT_RETENTION_DAYS", "14", "Screenshot retention"),
  ]),
  ...group("Email", [
    optional("MAIL_DRIVER", "smtp", "smtp | resend | console"),
    required("MAIL_FROM", "Sender address, for example Scraper <alerts@example.com>"),
    optional("SMTP_HOST", "", "SMTP server host"),
    optional("SMTP_PORT", "587", "SMTP server port"),
    optional("SMTP_USER", "", "SMTP username"),
    optional("SMTP_PASSWORD", "", "SMTP password", true),
    optional("SMTP_SECURE", "true", "Use TLS"),
    optional("RESEND_API_KEY", "", "Resend API key", true),
    optional("CHANNEL_FAILURE_LIMIT", "10", "Terminal failures before a channel auto disables"),
  ]),
  ...group("Observability", [
    optional("OTEL_EXPORTER_OTLP_ENDPOINT", "", "Empty disables tracing"),
    optional("OTEL_SERVICE_NAME", "scraper-api", "Service name reported to the collector"),
    optional("METRICS_ENABLED", "true", "Expose /metrics"),
    optional("SENTRY_DSN", "", "Sentry DSN", true),
  ]),
]

export const envGroups = (): readonly string[] => [...new Set(ENV_SPEC.map((entry) => entry.group))]
