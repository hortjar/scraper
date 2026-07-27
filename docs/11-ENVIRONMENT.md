# Environment Variables

Every variable is declared once in `core/config` as an Effect `Config`, which:

- validates and coerces at boot, failing fast with **all** problems listed at once,
- marks secrets `Config.redacted` so they can't be logged,
- generates `.env.example` via `pnpm gen:env` — the example file can never drift.

**`process.env` appears in exactly one package.** Anywhere else it's a lint error.

Legend: **R** = required (no default, boot fails without it) · secrets are marked 🔒

## Core

| Variable            | Default          | Notes                                                                                                                |
| ------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| `APP_ENV`           | `production`     | `development` \| `test` \| `production`                                                                              |
| `APP_URL`           | **R**            | Public URL, e.g. `https://scraper.example.com`. Used in emails, links, Origin checks                                 |
| `LOG_LEVEL`         | `info`           | `trace`…`error`                                                                                                      |
| `LOG_FORMAT`        | `json`           | `json` \| `pretty`                                                                                                   |
| `TZ`                | `UTC`            | Container timezone; user schedules use their own tz regardless                                                       |
| `APP_VERSION`       | _(package.json)_ | Semver. Defaults to the app's own `package.json`; set it only to override. Returned by `/health` and shown in the UI |
| `GIT_SHA`           | `local`          | Short commit, shown next to the version. Build arg only — no other source                                            |
| `DEFAULT_LOCALE`    | `en`             | Fallback when a user has none and `Accept-Language` doesn't match                                                    |
| `SUPPORTED_LOCALES` | `en,cs`          | Comma-separated; drives `/meta` and the language picker                                                              |

## API

| Variable              | Default   | Notes                                                         |
| --------------------- | --------- | ------------------------------------------------------------- |
| `API_PORT`            | `9300`    | See [10-DEPLOYMENT §0](./10-DEPLOYMENT.md) for the port block |
| `API_HOST`            | `0.0.0.0` |                                                               |
| `CORS_ORIGINS`        | _(empty)_ | Comma-separated. Empty = same-origin only                     |
| `TRUST_PROXY`         | `true`    | Read `X-Forwarded-For` for rate limiting                      |
| `BODY_LIMIT_BYTES`    | `1048576` |                                                               |
| `ENABLE_OPENAPI`      | `true`    |                                                               |
| `ENABLE_BULL_BOARD`   | `false`   | Admin-only queue dashboard                                    |
| `ENABLE_REGISTRATION` | `true`    | Turn off for a private instance                               |

## Database

| Variable                     | Default      | Notes                                                           |
| ---------------------------- | ------------ | --------------------------------------------------------------- |
| `POSTGRES_PASSWORD`          | **R** 🔒     | The only credential you set; the URL is assembled from it       |
| `POSTGRES_HOST`              | `postgres`   | Compose service name                                            |
| `POSTGRES_PORT`              | `5432`       | Container port, not the published one                           |
| `POSTGRES_USER`              | `scraper`    |                                                                 |
| `POSTGRES_DB`                | `scraper`    |                                                                 |
| `DATABASE_URL`               | _(empty)_ 🔒 | Escape hatch: a full string overrides every part above          |
| `DATABASE_POOL_MAX`          | `10`         | Per process. `api` replicas × this ≤ Postgres `max_connections` |
| `DATABASE_POOL_IDLE_TIMEOUT` | `30`         | seconds                                                         |
| `DATABASE_SSL`               | `false`      | `true` for managed Postgres                                     |
| `RUN_MIGRATIONS_ON_BOOT`     | `true`       | API runs them; workers wait                                     |

## Redis / queues

| Variable              | Default      | Notes                                                        |
| --------------------- | ------------ | ------------------------------------------------------------ |
| `REDIS_PASSWORD`      | _(empty)_ 🔒 | Unset on the bundled Redis; setting it wires `--requirepass` |
| `REDIS_HOST`          | `redis`      | Compose service name                                         |
| `REDIS_PORT`          | `6379`       | Container port, not the published one                        |
| `REDIS_DB`            | `0`          | Logical database index                                       |
| `REDIS_URL`           | _(empty)_ 🔒 | Escape hatch: overrides every part above                     |
| `JOB_PREFIX`          | `scraper`    | Namespace so environments can share Redis                    |
| `WORKER_CONCURRENCY`  | `5`          | Simultaneous scrapes per worker replica                      |
| `NOTIFY_CONCURRENCY`  | `20`         |                                                              |
| `SCRAPE_MAX_ATTEMPTS` | `3`          |                                                              |
| `JOB_BACKOFF_BASE_MS` | `30000`      | Exponential base                                             |

## Security 🔒

| Variable                       | Default   | Notes                                                                                         |
| ------------------------------ | --------- | --------------------------------------------------------------------------------------------- |
| `ENCRYPTION_KEY`               | **R** 🔒  | 32 bytes base64. Encrypts channel secrets. **Rotating it requires re-encryption** — see 10 §7 |
| `SESSION_SECRET`               | **R** 🔒  | Cookie signing                                                                                |
| `SESSION_TTL_SECONDS`          | `604800`  | 7 days sliding                                                                                |
| `SESSION_ABSOLUTE_TTL_SECONDS` | `2592000` | 30 days hard cap                                                                              |
| `SESSION_COOKIE_NAME`          | `sid`     |                                                                                               |
| `ARGON2_MEMORY_KIB`            | `19456`   |                                                                                               |
| `ARGON2_TIME_COST`             | `2`       |                                                                                               |
| `PASSWORD_BREACH_CHECK`        | `false`   | HIBP k-anonymity range API; fails open                                                        |
| `RATE_LIMIT_ENABLED`           | `true`    |                                                                                               |

Generate secrets: `openssl rand -base64 32`.

## Scraping

| Variable                       | Default                        | Notes                                |
| ------------------------------ | ------------------------------ | ------------------------------------ |
| `MIN_SCRAPE_INTERVAL_SECONDS`  | `300`                          | Floor for user schedules             |
| `MAX_MONITORS_PER_USER`        | `100`                          |                                      |
| `MAX_CONCURRENT_RUNS_PER_USER` | `5`                            |                                      |
| `SCRAPE_TIMEOUT_MS`            | `30000`                        | HTTP strategy                        |
| `SCRAPE_MAX_BYTES`             | `10485760`                     | 10 MB body cap                       |
| `SCRAPE_USER_AGENT`            | `ScraperBot/1.0 (+${APP_URL})` | Identify yourself                    |
| `RESPECT_ROBOTS_TXT`           | `true`                         |                                      |
| `ALLOW_ROBOTS_OVERRIDE`        | `false`                        | Per-monitor override, audit-logged   |
| `DOMAIN_RATE_LIMIT_PER_MINUTE` | `6`                            | Per target host, globally            |
| `AUTO_PAUSE_AFTER_FAILURES`    | `20`                           |                                      |
| `BLOCKED_HOST_PATTERNS`        | _(built-in)_                   | Extra SSRF denylist, comma-separated |

## Browser

| Variable                  | Default            | Notes                                                        |
| ------------------------- | ------------------ | ------------------------------------------------------------ |
| `BROWSER_WS_ENDPOINT`     | _(empty)_          | `ws://browser:3000` — empty = launch chromium in-process     |
| `BROWSER_TOKEN`           | _(empty)_          | Appended to the endpoint as `?token=`. Empty leaves it as-is |
| `BROWSER_TIMEOUT_MS`      | `45000`            |                                                              |
| `BROWSER_MAX_CONTEXTS`    | `4`                | Per worker replica                                           |
| `BROWSER_BLOCK_RESOURCES` | `image,media,font` | Default blocklist                                            |
| `SCREENSHOTS_ENABLED`     | `true`             |                                                              |

## Storage

| Variable                                   | Default           | Notes                    |
| ------------------------------------------ | ----------------- | ------------------------ |
| `STORAGE_DRIVER`                           | `local`           | `local` \| `s3`          |
| `STORAGE_LOCAL_PATH`                       | `/data/snapshots` | Must be a volume         |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`    | —                 | For `s3`                 |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | 🔒                |                          |
| `RUN_RETENTION_DAYS`                       | `90`              |                          |
| `SNAPSHOT_RETENTION_DAYS`                  | `30`              |                          |
| `SCREENSHOT_RETENTION_DAYS`                | `14`              | Biggest storage consumer |

## Email

| Variable                     | Default   | Notes                                            |
| ---------------------------- | --------- | ------------------------------------------------ |
| `MAIL_DRIVER`                | `smtp`    | `smtp` \| `resend` \| `console` (dev)            |
| `MAIL_FROM`                  | _(empty)_ | Unset disables email entirely                    |
| `SMTP_HOST`, `SMTP_PORT`     | —         | `SMTP_HOST` is what enables the `smtp` driver    |
| `SMTP_USER`, `SMTP_PASSWORD` | 🔒        |                                                  |
| `SMTP_SECURE`                | `true`    |                                                  |
| `RESEND_API_KEY`             | 🔒        |                                                  |
| `CHANNEL_FAILURE_LIMIT`      | `10`      | Auto-disable a channel after N terminal failures |

## Frontend (build-time, `VITE_` prefix)

| Variable                | Default   | Notes                                |
| ----------------------- | --------- | ------------------------------------ |
| `VITE_API_URL`          | `/api/v1` | Same-origin by default               |
| `VITE_APP_TITLE`        | `Scraper` |                                      |
| `VITE_DEFAULT_LOCALE`   | `en`      | UI fallback before the profile loads |
| `VITE_ENABLE_ANALYTICS` | `false`   |                                      |
| `VITE_SENTRY_DSN`       | _(empty)_ |                                      |

`VITE_API_PROXY` is the one that is read at **dev-server start**, not at build:
it is where `vite.config.ts` proxies `/api`, and it defaults to
`http://localhost:9300` — the API's port from
[10-DEPLOYMENT §0](./10-DEPLOYMENT.md). The dev server itself listens on `9301`.

`__APP_VERSION__` and `__GIT_SHA__` are Vite `define` constants. `__APP_VERSION__`
comes from `apps/web/package.json` unless a **non-blank** `APP_VERSION` overrides it;
`__GIT_SHA__` comes from `GIT_SHA` and falls back to `local`. The blank check matters:
Compose interpolates an unset variable to an empty string, and treating that as a real
value is what made the UI report `dev`. The client compares the result against
`/health` and offers a reload when the API is newer
([04-FRONTEND §8](./04-FRONTEND.md)).

> Vite inlines these at **build** time. To make them runtime-configurable in
> Portainer, `web`'s entrypoint rewrites a `/config.js` from env before nginx
> starts — so the same image works across environments without a rebuild.
> See [10-DEPLOYMENT §3](./10-DEPLOYMENT.md).

## Observability

| Variable                      | Default                          | Notes                           |
| ----------------------------- | -------------------------------- | ------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | _(empty)_                        | Empty disables tracing entirely |
| `OTEL_SERVICE_NAME`           | `scraper-api` / `scraper-worker` |                                 |
| `METRICS_ENABLED`             | `true`                           |                                 |
| `SENTRY_DSN`                  | _(empty)_ 🔒                     |                                 |

## Minimum viable `.env`

```env
APP_URL=https://scraper.example.com
POSTGRES_PASSWORD=<openssl rand -base64 32>
ENCRYPTION_KEY=<openssl rand -base64 32>
SESSION_SECRET=<openssl rand -base64 32>
BROWSER_TOKEN=<openssl rand -base64 32>
```

That is genuinely all of it. Postgres and Redis URLs are assembled from their parts,
which default to the compose services, and email is optional — an instance with no
mail configuration starts and reports `emailAvailable: false`.

Add a transport when you want notifications to leave the box:

```env
MAIL_FROM=Scraper <alerts@example.com>
SMTP_HOST=smtp.example.com
SMTP_USER=alerts@example.com
SMTP_PASSWORD=<secret>
```
