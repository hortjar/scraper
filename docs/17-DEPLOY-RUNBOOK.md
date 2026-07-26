# Deploy Runbook

The commands, in order, for putting a version of scraper into production.
[10-DEPLOYMENT](./10-DEPLOYMENT.md) explains _why_ the stack is shaped this way;
this page is what you type.

> **CI does not build images.** Since 0.3.0 the release workflow only cuts the
> GitHub release. Pushing a tag produces **no** `ghcr.io` image, so step 2 is not
> optional — skip it and the stack fails at pull time on a tag that does not exist.

## 0. Once per machine

```bash
gh auth login                              # or a PAT with write:packages
echo "$GHCR_TOKEN" | docker login ghcr.io -u <your-github-username> --password-stdin
```

The token needs `write:packages`. A classic PAT works; a fine-grained one needs
package write permission on the org.

## 1. Cut the version

Versions move in lockstep across the workspace — root, three apps, three packages.

```bash
pnpm lint && pnpm typecheck && pnpm test        # must be green before tagging
pnpm gen:openapi && pnpm gen:api && pnpm gen:env
git diff --exit-code                            # the same gate CI runs
```

That last line is the one that bites. The generators write files that are committed,
so a spec change that was never regenerated shows up here — and if you skip it
locally, `verify-generated` fails on `main` after you have already pushed.

Then bump the versions, update `CHANGELOG.md`, and:

```bash
git commit -am "chore(release): v0.3.0"
git tag -a v0.3.0 -m "v0.3.0"
git push origin main && git push origin v0.3.0
```

Commit messages go through commitlint — `release: v0.3.0` is rejected, and
`chore(release): v0.3.0` is the form that passes.

## 2. Build and push the images

```bash
export GH_ORG=<your-org-or-username>
export IMAGE_TAG=v0.3.0
export APP_VERSION=0.3.0
export GIT_SHA=$(git rev-parse --short HEAD)

cd deploy
docker compose -f docker-compose.yml -f docker-compose.build.yml build
docker compose -f docker-compose.yml -f docker-compose.build.yml push
```

Three images come out: `scraper-api`, `scraper-worker`, `scraper-web`, each tagged
`ghcr.io/$GH_ORG/scraper-<app>:$IMAGE_TAG`.

`APP_VERSION` and `GIT_SHA` are **build args, baked into the image** — they are not
runtime-overridable, because they identify the artifact and are what lets the web
client notice a version skew after a rolling deploy. Set them at build time or the
UI reports `dev`/`local`.

### The architecture trap

`docker compose build` produces **one architecture: the build host's.** The old CI
job used buildx for `linux/amd64,linux/arm64`. Building on an Apple Silicon Mac and
deploying to an x86 VPS gives you an image that will not start, with an `exec format
error` that does not obviously point at the cause.

If the deploy target does not match your machine, build multi-arch instead:

```bash
docker buildx create --use --name scraper-builder      # once
for app in api worker web; do
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --file "deploy/Dockerfile.$app" \
    --build-arg "APP_VERSION=$APP_VERSION" \
    --build-arg "GIT_SHA=$GIT_SHA" \
    --tag "ghcr.io/$GH_ORG/scraper-$app:$IMAGE_TAG" \
    --push .
done
```

Run that from the repo root, not `deploy/` — the build context is the root.

Verify what you actually published before deploying:

```bash
docker buildx imagetools inspect ghcr.io/$GH_ORG/scraper-api:$IMAGE_TAG
```

## 3. Environment

Eight variables have no default and fail the stack immediately if unset — that is
deliberate, so Portainer gives a clear message instead of a crash-looping container:

| Variable            | Notes                                                       |
| ------------------- | ----------------------------------------------------------- |
| `IMAGE_TAG`         | Must name an image you pushed in step 2                     |
| `APP_URL`           | Public URL, e.g. `https://scraper.example.com`              |
| `POSTGRES_PASSWORD` | `openssl rand -base64 32`                                   |
| `DATABASE_URL`      | Must embed the **same** password                            |
| `ENCRYPTION_KEY`    | `openssl rand -base64 32` — rotating it orphans stored data |
| `SESSION_SECRET`    | `openssl rand -base64 32` — rotating it logs everyone out   |
| `BROWSER_TOKEN`     | Any value, but required                                     |
| `MAIL_FROM`         | e.g. `Scraper <alerts@example.com>`                         |

`GH_ORG` is needed too — without it the image names resolve to `ghcr.io//scraper-api`.

Start from `deploy/portainer/stack.env.example`. The full reference, including every
optional variable, is [11-ENVIRONMENT](./11-ENVIRONMENT.md), generated from
`packages/core/src/config/environment-spec.ts`.

## 4. Deploy

Portainer → **Stacks → Add stack → Repository**, path `deploy/docker-compose.yml`,
paste the environment, deploy. Click-by-click detail is in
[`deploy/portainer/STACK.md`](../deploy/portainer/STACK.md).

Without Portainer:

```bash
cd deploy
docker compose --env-file .env up -d
```

Then watch the API come up — migrations run on boot under a Postgres advisory lock,
so replicas cannot race:

```bash
docker compose logs -f api
```

To confirm the deployed artifact is the one you just built, read the API's own
health endpoint. The production stack publishes **only** `web`, so this has to run
inside the network:

```bash
docker compose exec api wget -qO- http://localhost:9300/health
# {"status":"ok","version":"0.3.0","commit":"a1b2c3d","time":"..."}
```

`version` and `commit` come from the `APP_VERSION`/`GIT_SHA` build args, so a stale
value here means step 2 published an older image than you think.

Note that `curl http://localhost:8080/health` hits **nginx's own** static probe in
`deploy/nginx.conf`, which returns the literal string `ok` and never touches the
API. It tells you the web container is up, nothing more.

## 4a. Known blocker — the browser cannot reach the API

**Verified against the code on `main`, not a suspicion.** Three components each
assume a different contract for the same request path, and no two agree:

| Component                  | Where                        | Assumes the API lives at       |
| -------------------------- | ---------------------------- | ------------------------------ |
| Web app fallback           | `apps/web/src/lib/config.ts` | `/api/v1` — same origin        |
| nginx proxy                | `deploy/nginx.conf`          | upstream serves `/api/*`       |
| Compose / `Dockerfile.web` | `API_URL=http://api:9300`    | browser can resolve `api:9300` |

What the API actually serves, per `apps/api/openapi.json`, is `/health`, `/ready`,
`/metrics`, `/meta` — **at the root, with no prefix at all.**

The consequences compound:

- `proxy_pass http://api:9300/api` keeps the `/api` prefix on the upstream path, so
  a same-origin `GET /api/health` arrives at the API as `/api/health` and 404s.
- `API_URL=http://api:9300` is written into `config.js`, which is read by the
  **browser**. `api` is a Docker network hostname, so it does not resolve for a
  user, and would be cross-origin if it did — defeating the same-origin design that
  `10-DEPLOYMENT` §2 describes.
- The app's own fallback, `/api/v1`, adds a `v1` segment that exists nowhere else.

This has gone unnoticed because `createApp` currently mounts only `systemRoutes` —
the feature routes in `ROUTE` are declared but not wired up, so nothing in the UI
depends on a working API path yet.

**Fixing it is a design decision, not a typo**, which is why it is documented here
rather than patched: someone has to choose whether the API mounts under `/api/v1`,
or nginx strips the prefix (`proxy_pass http://api:9300/;` — the trailing slash is
what strips it), and `API_URL` has to become a browser-resolvable value, almost
certainly the relative `/api/v1`. Pick one contract and make all three agree.

Until then the stack starts and the UI serves, but any real API call from the
browser will fail.

## 5. First run

1. Register the first user.
2. Set `ENABLE_REGISTRATION=false` and redeploy, unless the instance is public.
3. Scale workers with `WORKER_REPLICAS` — they are stateless and need no coordination.

## 6. Upgrade and rollback

Upgrade is steps 1–2 for the new version, then change `IMAGE_TAG` and redeploy.

Rollback is `IMAGE_TAG` back to the previous tag and redeploy. This is safe because
migrations are **additive and backward-compatible within a release** — expand,
deploy, backfill, contract in a _later_ release. A migration that drops or renames a
column in the same release that stops using it breaks exactly this property, so it
does not get merged.

**Never deploy `:latest`.** Portainer's "re-pull and redeploy" against a moving tag
makes rollback guesswork.

## Troubleshooting

| Symptom                                        | Cause                                                                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `manifest unknown` on pull                     | Step 2 was skipped, or `IMAGE_TAG`/`GH_ORG` disagrees with what you pushed                                                                             |
| `exec format error` in a container             | Single-arch image built on a machine that does not match the target                                                                                    |
| Stack fails at parse with `env file not found` | `deploy/.env` is gitignored; `env_file` is `required: false` for that reason — do not make it required                                                 |
| A stack variable never reaches the app         | Portainer stack variables are the environment Compose is _parsed_ in. Only names listed in the `x-app-environment` anchor become container environment |
| UI shows version `dev`                         | `APP_VERSION`/`GIT_SHA` not passed as build args in step 2                                                                                             |
| Chromium crashes immediately                   | `shm_size: 1gb` missing on the `browser` service                                                                                                       |
