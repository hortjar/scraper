# Environment Variables

Every variable is declared once in `core/config` as an Effect `Config`, which:
- validates and coerces at boot, failing fast with **all** problems listed at once,
- marks secrets `Config.redacted` so they can't be logged,
- generates `.env.example` via `pnpm gen:env` — the example file can never drift.

**`process.env` appears in exactly one package.** Anywhere else it's a lint error.

Legend: **R** = required (no default, boot fails without it) · secrets are marked 🔒

## Core

| Variable | Default | Notes |
|---|---|---|
| `APP_ENV` | `production` | `development` \| `test` \| `production` |
| `APP_URL` | **R** | Public URL, e.g. `https://scraper.example.com`. Used in emails, links, Origin checks |
| `LOG_LEVEL` | `info` | `trace`…`error` |
| `LOG_FORMAT` | `json` | `json` \| `pretty` |
| `TZ` | `UTC` | Container timezone; user schedules use their own tz regardless |
| `APP_VERSION` | *(build arg)* | Semver, baked at build. Returned by `/health` and shown in the UI |
| `GIT_SHA` | *(build arg)* | Short commit, shown next to the version |
| `DEFAULT_LOCALE` | `en` | Fallback when a user has none and `Accept-Language` doesn't match |
| `SUPPORTED_LOCALES` | `en,cs` | Comma-separated; drives `/meta` and the language picker |

## API

| Variable | Default | Notes |
|---|---|---|
| `API_PORT` | `3001` | |
| `API_HOST` | `0.0.0.0` | |
| `CORS_ORIGINS` | *(empty)* | Comma-separated. Empty = same-origin only |
| `TRUST_PROXY` | `true` | Read `X-Forwarded-For` for rate limiting |
| `BODY_LIMIT_BYTES` | `1048576` | |
| `ENABLE_OPENAPI` | `true` | |
| `ENABLE_BULL_BOARD` | `false` | Admin-only queue dashboard |
| `ENABLE_REGISTRATION` | `true` | Turn off for a private instance |

## Database

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | **R** 🔒 | `postgres://user:pass@postgres:5432/scraper` |
| `DATABASE_POOL_MAX` | `10` | Per process. `api` replicas × this ≤ Postgres `max_connections` |
| `DATABASE_POOL_IDLE_TIMEOUT` | `30` | seconds |
| `DATABASE_SSL` | `false` | `true` for managed Postgres |
| `RUN_MIGRATIONS_ON_BOOT` | `true` | API runs them; workers wait |

## Redis / queues

| Variable | Default | Notes |
|---|---|---|
| `REDIS_URL` | **R** 🔒 | `redis://redis:6379/0` |
| `JOB_PREFIX` | `scraper` | Namespace so environments can share Redis |
| `WORKER_CONCURRENCY` | `5` | Simultaneous scrapes per worker replica |
| `NOTIFY_CONCURRENCY` | `20` | |
| `SCRAPE_MAX_ATTEMPTS` | `3` | |
| `JOB_BACKOFF_BASE_MS` | `30000` | Exponential base |

## Security 🔒

| Variable | Default | Notes |
|---|---|---|
| `ENCRYPTION_KEY` | **R** 🔒 | 32 bytes base64. Encrypts channel secrets. **Rotating it requires re-encryption** — see 10 §7 |
| `SESSION_SECRET` | **R** 🔒 | Cookie signing |
| `SESSION_TTL_SECONDS` | `604800` | 7 days sliding |
| `SESSION_ABSOLUTE_TTL_SECONDS` | `2592000` | 30 days hard cap |
| `SESSION_COOKIE_NAME` | `sid` | |
| `ARGON2_MEMORY_KIB` | `19456` | |
| `ARGON2_TIME_COST` | `2` | |
| `PASSWORD_BREACH_CHECK` | `false` | HIBP k-anonymity range API; fails open |
| `RATE_LIMIT_ENABLED` | `true` | |

Generate secrets: `openssl rand -base64 32`.

## Scraping

| Variable | Default | Notes |
|---|---|---|
| `MIN_SCRAPE_INTERVAL_SECONDS` | `300` | Floor for user schedules |
| `MAX_MONITORS_PER_USER` | `100` | |
| `MAX_CONCURRENT_RUNS_PER_USER` | `5` | |
| `SCRAPE_TIMEOUT_MS` | `30000` | HTTP strategy |
| `SCRAPE_MAX_BYTES` | `10485760` | 10 MB body cap |
| `SCRAPE_USER_AGENT` | `ScraperBot/1.0 (+${APP_URL})` | Identify yourself |
| `RESPECT_ROBOTS_TXT` | `true` | |
| `ALLOW_ROBOTS_OVERRIDE` | `false` | Per-monitor override, audit-logged |
| `DOMAIN_RATE_LIMIT_PER_MINUTE` | `6` | Per target host, globally |
| `AUTO_PAUSE_AFTER_FAILURES` | `20` | |
| `BLOCKED_HOST_PATTERNS` | *(built-in)* | Extra SSRF denylist, comma-separated |

## Browser

| Variable | Default | Notes |
|---|---|---|
| `BROWSER_WS_ENDPOINT` | *(empty)* | `ws://browser:3000` — empty = launch chromium in-process |
| `BROWSER_TIMEOUT_MS` | `45000` | |
| `BROWSER_MAX_CONTEXTS` | `4` | Per worker replica |
| `BROWSER_BLOCK_RESOURCES` | `image,media,font` | Default blocklist |
| `SCREENSHOTS_ENABLED` | `true` | |

## Storage

| Variable | Default | Notes |
|---|---|---|
| `STORAGE_DRIVER` | `local` | `local` \| `s3` |
| `STORAGE_LOCAL_PATH` | `/data/snapshots` | Must be a volume |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION` | — | For `s3` |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | 🔒 | |
| `RUN_RETENTION_DAYS` | `90` | |
| `SNAPSHOT_RETENTION_DAYS` | `30` | |
| `SCREENSHOT_RETENTION_DAYS` | `14` | Biggest storage consumer |

## Email

| Variable | Default | Notes |
|---|---|---|
| `MAIL_DRIVER` | `smtp` | `smtp` \| `resend` \| `console` (dev) |
| `MAIL_FROM` | **R** | `Scraper <alerts@example.com>` |
| `SMTP_HOST`, `SMTP_PORT` | — | |
| `SMTP_USER`, `SMTP_PASSWORD` | 🔒 | |
| `SMTP_SECURE` | `true` | |
| `RESEND_API_KEY` | 🔒 | |
| `CHANNEL_FAILURE_LIMIT` | `10` | Auto-disable a channel after N terminal failures |

## Frontend (build-time, `VITE_` prefix)

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_URL` | `/api/v1` | Same-origin by default |
| `VITE_APP_TITLE` | `Scraper` | |
| `VITE_DEFAULT_LOCALE` | `en` | UI fallback before the profile loads |
| `VITE_ENABLE_ANALYTICS` | `false` | |
| `VITE_SENTRY_DSN` | *(empty)* | |

`__APP_VERSION__` and `__GIT_SHA__` are Vite `define` constants sourced from
`APP_VERSION`/`GIT_SHA` at build time. The client compares them against `/health`
and offers a reload when the API is newer ([04-FRONTEND §8](./04-FRONTEND.md)).

> Vite inlines these at **build** time. To make them runtime-configurable in
> Portainer, `web`'s entrypoint rewrites a `/config.js` from env before nginx
> starts — so the same image works across environments without a rebuild.
> See [10-DEPLOYMENT §3](./10-DEPLOYMENT.md).

## Observability

| Variable | Default | Notes |
|---|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | *(empty)* | Empty disables tracing entirely |
| `OTEL_SERVICE_NAME` | `scraper-api` / `scraper-worker` | |
| `METRICS_ENABLED` | `true` | |
| `SENTRY_DSN` | *(empty)* 🔒 | |

## Minimum viable `.env`

```env
APP_URL=https://scraper.example.com
DATABASE_URL=postgres://scraper:CHANGEME@postgres:5432/scraper
REDIS_URL=redis://redis:6379/0
ENCRYPTION_KEY=<openssl rand -base64 32>
SESSION_SECRET=<openssl rand -base64 32>
MAIL_FROM=Scraper <alerts@example.com>
SMTP_HOST=smtp.example.com
SMTP_USER=alerts@example.com
SMTP_PASSWORD=<secret>
```
