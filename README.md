# Scraper

Self-hostable web scraping and change-monitoring platform. Point it at a page, say
what to extract, say when a change matters, and pick how you want to hear about it.

> **Status: planning complete, implementation not started.**
> The full plan lives in [`docs/`](./docs/README.md). Start with
> [docs/00-IMPLEMENTATION-PLAN.md](./docs/00-IMPLEMENTATION-PLAN.md).

## What it does

- Monitor any URL on an interval or cron schedule, in your timezone
- Extract named fields with CSS, XPath, JSONPath, regex, or JSON-LD selectors
- Static-HTML fetching by default, a real browser when the page needs one
- Ignore the noise (timestamps, ads, session tokens) so alerts mean something
- Alert on real conditions: any change, a keyword, a price dropping >5%, back in
  stock, or the monitor itself breaking
- Notify through email, webhooks, Slack, Discord, Telegram — and any channel you add
- Throttling, quiet hours, and digests, because notification fatigue kills these tools
- Full run history, diffs, and value charts
- REST API with OpenAPI, API keys, and signed outbound webhooks

## Stack

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces — 4 packages, 3 apps |
| Backend | Bun · Elysia · Effect · Drizzle · Postgres |
| Jobs | BullMQ · Redis |
| Scraping | fetch + Cheerio · Playwright |
| API | OpenAPI 3.1 · Swagger UI · Hey API generated client |
| Frontend | Vite · React 19 · TanStack Query/Store/Router · shadcn/ui · Tailwind 4 · i18next |
| Deploy | Docker Compose on Portainer |

## Layout

```
apps/      api (Elysia) · worker (BullMQ) · web (landing + console)
packages/  core (domain, errors, constants, config, i18n, observability)
           db (schema, migrations, repositories)
           server (feature modules: auth, monitors, scraping, runs,
                   notifications, jobs)
           tooling (tsconfig, eslint, prettier)
deploy/    Dockerfiles, compose stacks, Portainer guide
docs/      the plan and every convention
```

Features are **modules inside `server`**, not separate packages — same isolation,
far less ceremony. See [docs/01-ARCHITECTURE.md](./docs/01-ARCHITECTURE.md).

## Quick start (once Phase 0 lands)

```bash
pnpm install
cp deploy/.env.example .env      # generate secrets: openssl rand -base64 32
pnpm dev                         # infra via docker compose + api/worker/web with reload
```

Self-hosting: [docs/10-DEPLOYMENT.md](./docs/10-DEPLOYMENT.md).

## Contributing

Start at **[AGENTS.md](./AGENTS.md)** — the coding contract. Then
[docs/12-AGENT-WORKSTREAMS.md](./docs/12-AGENT-WORKSTREAMS.md) for who owns which
paths. Conventions: [backend](./docs/03-BACKEND.md) · [frontend](./docs/04-FRONTEND.md) ·
[design](./docs/15-DESIGN-SYSTEM.md) · [i18n](./docs/16-I18N.md) ·
[testing](./docs/14-TESTING.md).

Every change updates the docs it invalidates. That rule is load-bearing here.

## Responsible use

Ships with robots.txt honored, per-domain rate limits, a minimum scrape interval,
and an identifying User-Agent. No anti-bot evasion, by design. You are responsible
for the terms of service and data-protection law that apply to what you monitor.
