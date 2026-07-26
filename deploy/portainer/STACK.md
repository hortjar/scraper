# Portainer Stack Deployment

## Prerequisites

- Docker Engine 20.10+ or Docker Desktop
- Portainer CE installed and running
- Repository access to `ghcr.io/${GH_ORG}/scraper-*` images

## Deployment Steps

### 1. Create a Stack via Git Repository

In Portainer:

1. Navigate to **Stacks** → **Add stack**
2. Select **Repository** (enables GitOps and "Pull and redeploy")
3. Paste repository URL: `https://github.com/your-org/scraper`
4. Set compose path: `deploy/docker-compose.yml`
5. Click **Deploy the stack**

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

These variables **must** be set or the stack will not start:

- `POSTGRES_PASSWORD` — generate: `openssl rand -base64 32`
- `DATABASE_URL` — format: `postgres://scraper:PASSWORD@postgres:5432/scraper`
- `REDIS_URL` — default: `redis://redis:6379/0`
- `ENCRYPTION_KEY` — generate: `openssl rand -base64 32`
- `SESSION_SECRET` — generate: `openssl rand -base64 32`
- `BROWSER_TOKEN` — any value, but required; example: `openssl rand -base64 32`
- `GH_ORG` — your GitHub organization or username
- `IMAGE_TAG` — image tag to deploy (e.g., `v0.1.0` or `sha-a1b2c3d`)
- `APP_URL` — the public URL, e.g. `https://scraper.example.com`
- `MAIL_FROM` — e.g. `Scraper <alerts@example.com>`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` — your mail server

`APP_VERSION` and `GIT_SHA` are optional — they only feed the version indicator in
the UI. `DATABASE_URL` must embed the same password you set in `POSTGRES_PASSWORD`;
they are two separate variables and nothing cross-checks them.

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
- `api` must be healthy before `web` starts

If a dependent service won't start, check the service's logs — it's waiting for a dependency to become healthy.

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

Metrics are available at `http://api:9300/metrics` (Prometheus format) if `METRICS_ENABLED=true`.

A Prometheus/Grafana overlay is Phase-3 work (stream O) and does not exist yet.
Scrape `api:9300/metrics` from an existing Prometheus if you have one.

## Troubleshooting

| Problem                                   | Check                                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| Services keep restarting                  | View service logs; check required env vars are set                                      |
| API won't start after deploy              | Check `DATABASE_URL` format and postgres health                                         |
| Workers idle, no scrapes running          | Check `BROWSER_WS_ENDPOINT` and browser service logs                                    |
| Browser segfaults with concurrency errors | Increase `shm_size` on browser service (minimum 1GB)                                    |
| Login fails / session cookies missing     | Check `MAIL_FROM` and SMTP config; verify same-origin (web proxies /api to api service) |
| Old sessions still valid after deploying  | `SESSION_SECRET` rotation invalidates all sessions; users re-login (acceptable)         |

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
