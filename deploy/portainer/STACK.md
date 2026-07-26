# Portainer Stack Deployment

## Prerequisites

- Docker Engine 20.10+ or Docker Desktop
- Portainer CE installed and running

**No registry access is required.** Portainer clones this repository for a Git-backed
stack, and `deploy/docker-compose.yml` carries the `build:` config, so Compose builds
the three app images from the clone. One compose path, nothing extra to configure —
`IMAGE_REGISTRY` and `IMAGE_TAG` default to `local` and `dev`.

Pulling pre-built images from `ghcr.io/<org>/scraper-*` is the alternative, not the
requirement. It buys pinned tags and instant rollback at the cost of publishing them
yourself, since CI does not.

## Deployment Steps

### 1. Create a Stack via Git Repository

In Portainer:

1. Navigate to **Stacks** → **Add stack**
2. Select **Repository** (enables GitOps and "Pull and redeploy")
3. Paste repository URL: `https://github.com/your-org/scraper`
4. Set compose path: `deploy/docker-compose.yml`
5. Click **Deploy the stack**

The first deploy builds three images and takes a few minutes. Later deploys reuse
the layer cache unless the lockfile changed.

### 2. Configure Environment Variables

On the stack editor screen, scroll to **Environment variables** and load
`deploy/portainer/stack.env.example` — either paste it with **Advanced mode** or
add the entries one by one. Fill in every blank value first (see step 3).

**That is the only mechanism you need.** Portainer's stack variables become the
environment in which Compose is parsed, and `docker-compose.yml` forwards them into
the `api` and `worker` containers through an `x-app-environment` anchor. Required
variables are declared `${VAR:?required}`, so a missing one fails the deploy
immediately with the variable's name instead of starting a container that crash-loops.

Optional variables are listed in that anchor **by name only**. Compose forwards them
if set and omits them entirely if not, so unset variables fall through to the
application's own defaults in `packages/core/src/config`. This is deliberate: writing
`SMTP_HOST=${SMTP_HOST:-}` would set an _empty string_ inside the container, which
looks configured to the app and overrides its default. If you add a variable to the
anchor, add it as a bare name unless it is genuinely required.

`env_file: [.env]` is still declared on both services but marked `required: false`.
It exists for local `docker compose` runs where a `deploy/.env` file is convenient.
Portainer clones the repository and `deploy/.env` is gitignored, so it will not exist
there — and because it is optional, that is fine. **Do not** try to make Portainer
supply a `.env` file; use the stack variables.

### 3. Set Required Secrets

**Hard requirements.** Each is declared `${VAR:?required}` in the compose file, so a
missing one fails the deploy immediately, naming the variable:

| Variable            | Value                                                      |
| ------------------- | ---------------------------------------------------------- |
| `IMAGE_TAG`         | The tag you pushed, e.g. `v0.5.0`. **Not** `latest`        |
| `APP_URL`           | Public URL, e.g. `https://scraper.example.com`             |
| `POSTGRES_PASSWORD` | `openssl rand -base64 32`                                  |
| `ENCRYPTION_KEY`    | `openssl rand -base64 32`                                  |
| `SESSION_SECRET`    | `openssl rand -base64 32`                                  |
| `BROWSER_TOKEN`     | Any non-empty value; shared with the browserless container |

**No image variables are required.** `IMAGE_REGISTRY` and `IMAGE_TAG` default to
`local` and `dev`, which is what lets the build path run with no image configuration
at all. Set them only when pulling published images — and then `IMAGE_TAG` must name
a tag that was actually pushed, because nothing publishes it for you.

**There is no `DATABASE_URL` to set.** The app assembles the connection string from
`POSTGRES_HOST` (`postgres`), `POSTGRES_PORT` (`5432`), `POSTGRES_USER` (`scraper`),
`POSTGRES_DB` (`scraper`) and `POSTGRES_PASSWORD`. Only the password has no default,
and it is the same variable the `postgres` service itself uses — **one password, one
place.** Redis is assembled the same way from `REDIS_HOST`/`PORT`/`DB` and an
optional `REDIS_PASSWORD`.

This replaced a genuine failure, not just a duplication: the recommended
`openssl rand -base64 32` produces passwords containing `+`, `/` and `=`, which
change where a URL's host begins. Pasted into the old `DATABASE_URL` they produced a
connection error that pointed nowhere near the cause. The parts are percent-encoded
on assembly, so any password works.

Set `DATABASE_URL` or `REDIS_URL` **only** for a managed Postgres or Redis that hands
you a complete connection string. An explicit value overrides the parts.

If you set `REDIS_PASSWORD`, the bundled Redis picks it up automatically —
`--requirepass` and the healthcheck's `-a` flag are both wired from the same
variable, so you do not have to touch the compose file.

**Email is optional.** Leave `MAIL_FROM` unset and the stack starts normally;
`/api/v1/meta` then reports `emailAvailable: false` and the UI hides email channels
rather than offering a delivery that would silently fail. To enable it you need
`MAIL_FROM` **and** a transport: `SMTP_HOST` (plus the other `SMTP_*`) on the default
`smtp` driver, or `RESEND_API_KEY` with `MAIL_DRIVER=resend`. Setting one without the
other leaves email unavailable.

**Have working defaults — do not set unless you are changing them:** `WEB_PORT`
(`8080`), `API_URL` (`/api/v1`), `POSTGRES_USER`/`POSTGRES_DB` (`scraper`), and
everything in the optional block of `stack.env.example`.

One that still catches people:

- **`ENCRYPTION_KEY` is effectively permanent.** It encrypts notification channel
  secrets and there is no rotation tooling yet, so changing it makes every stored
  secret unreadable. Back it up where you will not lose it.

`APP_VERSION` and `GIT_SHA` are optional and only feed the UI's version indicator.
Leave them unset: each app reports its own `package.json` version, and `GIT_SHA`
falls back to `local`. Setting `APP_VERSION` to a placeholder like `dev` actively
makes things worse — the app cannot distinguish it from a real version.

### 3b. Pulling published images instead of building

The default is to build. To deploy pinned images from a registry, add
`deploy/docker-compose.registry.yml` as a second compose path (or set
`IMAGE_PULL_POLICY=always`) and set `IMAGE_REGISTRY` and `IMAGE_TAG`.

Without that overlay the stack builds even when `IMAGE_REGISTRY` is set, because the
base file declares `pull_policy: build`. That default is deliberate: a single-compose-path
Git stack — which is how Portainer deploys — must work without extra configuration,
and the failure mode of the opposite default is
`pull access denied for local/scraper-api`.

### 3a. Variables that do NOT reach the containers

`docker-compose.yml` forwards a fixed list through its `x-app-environment` anchor.
**A variable outside that list is silently ignored** — Portainer accepts it, Compose
uses it while parsing, and it never becomes container environment. These 23 appear in
`docs/11-ENVIRONMENT.md` and `deploy/.env.example` but are **not** forwarded:

```
ALLOW_ROBOTS_OVERRIDE   API_HOST                  API_PORT
ARGON2_MEMORY_KIB       ARGON2_TIME_COST          BODY_LIMIT_BYTES
BROWSER_BLOCK_RESOURCES CHANNEL_FAILURE_LIMIT     DATABASE_POOL_IDLE_TIMEOUT
JOB_BACKOFF_BASE_MS     JOB_PREFIX                MAX_CONCURRENT_RUNS_PER_USER
PASSWORD_BREACH_CHECK   SCRAPE_MAX_ATTEMPTS       SCRAPE_MAX_BYTES
SCREENSHOT_RETENTION_DAYS  SESSION_ABSOLUTE_TTL_SECONDS  SESSION_COOKIE_NAME
S3_ACCESS_KEY_ID        S3_BUCKET                 S3_ENDPOINT
S3_REGION               S3_SECRET_ACCESS_KEY
```

Two consequences worth calling out:

- **`STORAGE_DRIVER=s3` cannot be configured from Portainer.** The driver name is
  forwarded but none of the five `S3_*` credentials are, so selecting it gives you a
  storage driver with no endpoint or key. Stay on `local` until the anchor gains
  them.
- `API_PORT`/`API_HOST` being absent is deliberate — `nginx.conf` and the compose
  healthcheck hardcode `9300`, so changing them would break the proxy rather than
  move the port.

To make one of these settable, add it to the `x-app-environment` anchor **as a bare
name**, not as `NAME=${NAME:-}`. The bare form lets Compose omit an unset variable so
the app's own default applies; the assignment form sets an empty string, which looks
configured and overrides that default.

### 4. Deploy

Click **Deploy the stack**

Watch the logs:

- Click **api** service → **Logs**
- Look for database migration output (if `RUN_MIGRATIONS_ON_BOOT=true`)
- Wait for `api` to report healthy

### 5. Register First User

1. Navigate to the app URL (default: `http://your-host:8080`)
2. Click **Register**
3. Create the admin user

### 6. Disable Registration (Recommended for Production)

1. Return to the stack editor
2. Add or modify: `ENABLE_REGISTRATION=false`
3. Redeploy

### 7. Scale Workers

Workers are stateless. To increase scraping throughput:

**On plain Docker (most Portainer users):**

1. In the stack editor, change `WORKER_REPLICAS=5` (or desired count)
2. Redeploy

**On Docker Swarm:**

- The compose file uses `deploy.replicas`, which works natively in Swarm
- Change the value and redeploy

### 8. Upgrade

To deploy a new version:

1. **Build and push the images first** — CI does not do this. See
   [docs/10-DEPLOYMENT.md §8](../../docs/10-DEPLOYMENT.md). A git tag alone does not
   produce a deployable image, so an `IMAGE_TAG` that was never pushed fails the
   pull.
2. Update `IMAGE_TAG` to that image tag (e.g., `v0.2.0`)
3. Optionally update `APP_VERSION` and `GIT_SHA` (for version tracking)
4. Redeploy

**Rolling deployment** — Docker will start new containers and drain old ones respecting `stop_grace_period`.

### 9. Rollback

If an upgrade fails or a bug is discovered:

1. Change `IMAGE_TAG` back to the previous tag
2. Redeploy

**Data is safe** — migrations are additive within a release and backward-compatible.

## Important Notes

### `shm_size` on the browser service

The browserless chromium container requires 1GB shared memory to avoid segfaults under concurrency. This is set in the compose file but verify it in Portainer:

1. **Containers** → **browser** → **Inspect**
2. Look for `HostConfig.ShmSize: 1073741824` (1GB in bytes)
3. If missing, the stack was not parsed correctly — check the compose file syntax

Run: `docker inspect <container> | grep ShmSize`

### Named volumes

We use named volumes (`pgdata`, `redisdata`, `snapshots`) so Portainer can:

- Back them up via the Volumes tab
- See their size and usage
- Attach external storage (NFS, S3)

Bind mounts would only be accessible via the host filesystem.

### Health checks and `depends_on`

- `postgres` and `redis` must be healthy before `api` starts
- `api` must be healthy before `worker` starts
- `web` starts once `api` has started — it does **not** wait for health

If a dependent service won't start, check the service's logs — it's waiting for a
dependency to become healthy.

> ### The worker has no health check, deliberately
>
> `api` probes `/api/v1/ready` through `apps/api/scripts/healthcheck.ts`, so
> `service_healthy` means the API can actually reach Postgres and Redis. That is what
> `worker` waits on.
>
> The worker itself declares no `HEALTHCHECK`. It runs no HTTP server, so there is
> nothing to probe without inventing a listener; Docker reports it as `running`
> rather than `healthy`, and `restart: unless-stopped` covers crashes. A real
> liveness signal — asserting its BullMQ connection, say — is still open work.
>
> Both Dockerfiles previously ran `bun run healthcheck.ts`, a file that did not exist
> in the repository. Both containers stayed `unhealthy` forever and the worker, which
> waits on `service_healthy`, never started at all.

### Logs and stdout

All services log to stdout as JSON. Portainer's **Logs** tab shows them live. For production:

- Log shipper (Grafana Loki, ELK, Datadog) can consume from the Docker socket

### Session cookies

The API uses secure, `SameSite=Lax` cookies. No CSRF tokens needed because web and API are the same origin (nginx proxies `/api` to the api service). This is why deploying web and api separately (e.g., on different domains) breaks login.

### Browser service and Playwright

The worker container runs Playwright but **launches no browser** by itself. Instead it connects to the separate `browser` service via WebSocket. This design allows:

- Multiple workers to share one browser pool
- Browser crashes to be isolated
- Scaling browser resources independently of scraping logic

The connection string is: `BROWSER_WS_ENDPOINT=ws://browser:3000?token=${BROWSER_TOKEN}`

If this endpoint is empty, the worker will try to launch Chromium in-process, which requires additional system dependencies.

### Encryption key rotation

`ENCRYPTION_KEY` encrypts notification channel secrets (e.g., webhook URLs, email passwords). **There is no rotation tooling yet** — it is Phase-3 work (stream N in
[docs/00-IMPLEMENTATION-PLAN.md](../../docs/00-IMPLEMENTATION-PLAN.md)). Until it
exists, changing this value makes every stored channel secret unreadable and users
must re-enter them. Treat the key as permanent for now, and back it up somewhere you
will not lose it.

### PostgreSQL backup

Backups are the operator's responsibility. Recommended:

```bash
docker exec scraper_postgres_1 pg_dump -U scraper scraper | gzip > backup-$(date +%Y%m%d).sql.gz
```

Restore:

```bash
docker exec -i scraper_postgres_1 psql -U scraper scraper < backup.sql
```

Or use Portainer's volume backup feature.

### Monitoring

Metrics are available at `http://api:9300/api/v1/metrics` (Prometheus format) if `METRICS_ENABLED=true`.

A Prometheus/Grafana overlay is Phase-3 work (stream O) and does not exist yet.
Scrape `api:9300/api/v1/metrics` from an existing Prometheus if you have one.

## Troubleshooting

| Problem                                   | Check                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------- |
| Services keep restarting                  | View service logs; check required env vars are set                                    |
| API won't start after deploy              | Check `POSTGRES_PASSWORD` reached the container and postgres is healthy               |
| Workers idle, no scrapes running          | Check `BROWSER_WS_ENDPOINT` and browser service logs                                  |
| Browser segfaults with concurrency errors | Increase `shm_size` on browser service (minimum 1GB)                                  |
| Login fails / session cookies missing     | Verify same-origin: `API_URL` must be the relative `/api/v1`, not a container address |
| Old sessions still valid after deploying  | `SESSION_SECRET` rotation invalidates all sessions; users re-login (acceptable)       |

## Health Check Endpoints

| Service  | Endpoint         | Notes                              |
| -------- | ---------------- | ---------------------------------- |
| api      | `/health`        | Returns 200 with version info      |
| web      | `/health`        | Returns 200 "ok"                   |
| worker   | None (internal)  | Checks via api dependency          |
| postgres | `pg_isready`     | Checked by compose health check    |
| redis    | `redis-cli ping` | Checked by compose health check    |
| browser  | (none, wrapped)  | Checked indirectly via browserless |

## CI/CD Integration

To automatically redeploy on new image tags:

1. In the stack editor, enable **Auto-update** (if supported by your Portainer version)
2. Or use a webhook: Portainer provides a webhook URL in the stack editor; POST to it after pushing images
3. Or use **GitOps** mode: set the repo branch and Portainer will poll for changes to the compose file
