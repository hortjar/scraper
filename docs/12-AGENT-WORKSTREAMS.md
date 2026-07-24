# Agent Workstreams — Parallelization Plan

The architecture exists partly to make this document possible: **module boundaries
plus a Phase-0 contract freeze let N agents work simultaneously with near-zero
merge conflicts.**

## 1. The four rules that make parallelism work

1. **One agent owns a path.** Every file has exactly one owning stream at a time.
   The map in §2 is the authority. Need a change outside your paths? File a request;
   don't edit.
2. **Contracts freeze before parallel work starts.** `@scraper/core` (domain,
   errors, constants, config, i18n) and `@scraper/db` land in Phase 0 and change
   afterwards only by an announced amendment (§6).
3. **Composition roots are append-only.** `apps/api/src/app.ts`,
   `apps/worker/src/main.ts`, and `web/routes/__root.tsx` carry marked insertion
   points. Each stream adds one line. Conflicts there are trivial.
4. **Generated files are nobody's to hand-edit.** `apps/api/openapi.json` and
   `apps/web/src/api/generated/**` are produced by `pnpm gen:openapi && pnpm gen:api`.
   Regenerate, don't patch.

## 2. Ownership map

| Stream | Owns (exclusive write) | Reads |
|---|---|---|
| **0 · Foundation** | root configs, `packages/tooling/**`, `packages/core/**`, `packages/db/**`, app skeletons, `deploy/**`, `.github/**` | — |
| **A · Auth** | `server/src/modules/auth/**`, `web/src/features/auth/**`, `web/src/routes/_auth/**` | core, db |
| **B · Monitors** | `server/src/modules/monitors/**` | core, db, jobs types |
| **C · Scraping** | `server/src/modules/scraping/**` | core |
| **D · Notifications** | `server/src/modules/notifications/**` | core, db |
| **E · Jobs** | `server/src/modules/jobs/**`, `apps/worker/src/**` | core, db |
| **F · Web shell** | `web/src/{components,lib,stores,i18n,styles}/**`, `web/src/routes/__root.tsx`, `web/src/routes/_app/index.tsx` | generated client |
| **G · Change detection** | `server/src/modules/runs/**` | core, db, scraping & notifications types |
| **H · Monitor UI** | `web/src/features/monitors/**`, `web/src/routes/_app/monitors/**` | F's components, generated client |
| **I · Runs UI** | `web/src/features/runs/**`, `web/src/routes/_app/runs/**` | same |
| **J · Channels** | `server/src/modules/notifications/channels/**` (after D lands the registry), `web/src/features/channels/**` | same |
| **K · Scheduling polish** | `server/src/modules/jobs/{digest,limits,health}/**` | — |
| **L · Landing page** | `web/src/landing/**`, `web/src/routes/index.tsx`, `web/src/i18n/locales/*/landing.json` | F's tokens only |
| **M/N/O/P · Hardening** | tests, `deploy/**`, `docs/**` — coordinated, mostly additive | everything |

Every stream additionally owns its own i18n namespace file and its module README.

## 3. Dependency graph

```
                          ┌──────────────┐
                          │ 0 Foundation │  (serial, blocking)
                          └──────┬───────┘
        ┌──────────┬─────────┬───┴────┬─────────┬──────────┐
        ▼          ▼         ▼        ▼         ▼          ▼
      A Auth   B Monitors  C Scrape  D Notify  E Jobs   F Web shell
        └──────────┴─────────┴────┬───┴─────────┴──────────┘
                                  ▼
                          ═══ I1 integration ═══
              ┌────────┬─────────┬────┴────┬────────┬────────┐
              ▼        ▼         ▼         ▼        ▼        ▼
          G Changes  H Mon-UI  I Runs-UI  J Chan  K Sched  L Landing
              └────────┴─────────┴────┬────┴────────┴────────┘
                                      ▼
                          ═══ I2 integration ═══
                          M · N · O · P (hardening)
```

Phase-1 streams are independent **because they communicate only through Phase-0
types**. C doesn't import B — it takes a `MonitorConfig` from `core`. E doesn't
import C — it depends on a `ScrapeRunner` interface that G later implements.
L (landing) depends only on F's design tokens, so it can start the moment F lands.

## 4. Stream briefs

Written to be handed to an agent verbatim. All of them inherit §5.

---

### A · Auth
> Implement `server/src/modules/auth` per [08-AUTH](./08-AUTH.md) and the auth
> routes in [09-API §2](./09-API.md). Deliver: Argon2id passwords, opaque session
> tokens with sliding + absolute expiry, the `requireUser` macro accepting cookie
> or API key, register/verify/reset flows against a `Mailer` tag you define in
> `core`, Redis sliding-window rate limiting, audit logging, API keys with scopes.
> Then the frontend auth feature: login/register/reset screens, session bootstrap
> query, route guards.
> **Watch out:** no user enumeration — identical responses *and* timing for unknown
> emails. Ownership checks live in services, never routes.

### B · Monitors
> Implement `server/src/modules/monitors` per [02 §2](./02-DATA-MODEL.md) and
> [09 §2](./09-API.md). Deliver: monitor + extractor CRUD, URL normalization and the
> SSRF guard (export it — C and D both need it), schedule validation against
> `MIN_SCRAPE_INTERVAL_SECONDS`, plan limits, cursor pagination, filtering,
> archive vs purge, duplicate, import/export. Call `JobProducer.upsertSchedule` on
> every mutation via the tag, not the implementation.
> **Watch out:** every query filters `userId` in SQL.

### C · Scraping
> Implement `server/src/modules/scraping` per [05-SCRAPING](./05-SCRAPING.md).
> Deliver: `ScrapeStrategy` + registry, `http` and `browser` strategies, extraction
> for all six selector kinds, the transform pipeline, normalization and hashing,
> `previewScrape`, robots.txt caching.
> **This module must not import `@scraper/db`** — it is pure input→output, and the
> lint config enforces it. Build the golden-file fixture suite as you go.
> **Watch out:** a missing required extractor is an error, never a change.

### D · Notifications
> Implement `server/src/modules/notifications` per [06-NOTIFICATIONS](./06-NOTIFICATIONS.md).
> Deliver: the `NotificationChannel` interface, registry + `ChannelSet` layer, config
> encryption, `email` and `webhook` adapters, the generic renderer and sandboxed
> template engine, the dispatcher with retry classification and dedupe, channel CRUD
> routes, `GET /channels/kinds` descriptors, delivery recording. All copy through
> `core/i18n`, resolved in the **recipient's** locale.
> **The extension seam is the deliverable.** Prove it: write the `discord` adapter
> last and time it. Over 30 minutes means the seam is wrong.

### E · Jobs
> Implement `server/src/modules/jobs` and `apps/worker` per [07-SCHEDULING](./07-SCHEDULING.md).
> Deliver: queue definitions from `QUEUE` constants, payload schemas, `JobProducer`
> with deterministic jitter, worker bootstrap with `ManagedRuntime` and graceful
> shutdown, per-domain Redis rate limiter, retry/backoff, maintenance jobs
> (reconcile, sweep, stats, heartbeat), Bull Board behind a flag, queue metrics.
> Consume a `ScrapeRunner` interface defined in `core`; ship a logging stub so the
> worker runs end to end before G lands.
> **Watch out:** every handler must be safe to run twice.

### F · Web shell
> Build the frontend foundation per [04-FRONTEND](./04-FRONTEND.md) and
> [15-DESIGN-SYSTEM](./15-DESIGN-SYSTEM.md). Deliver: Tailwind 4 token layer
> (neutrals, brand, semantics, the 8-hue Signal ramp, light + dark), self-hosted
> Archivo + Geist Mono, the type scale, `AppShell`/`AuthShell`/`MarketingShell`,
> molecules (`StatusPill`, `DeltaBadge`, `MetricTile`, `CopyableCode`, `AppVersion`,
> `ConnectionIndicator`) and organisms (`DataTable`, `CommandPalette`, `AppSidebar`),
> **`PulseStrip` at all three scales** — it's the signature and everyone else consumes
> it — the configured API client with 401 refresh and `ApiError`, QueryClient policy,
> i18next setup with the `common` namespace, the `lib/browser` primitive set, MSW.
> **You are building the vocabulary H/I/J/L speak.** Over-invest here; document each
> component with a usage example in its file header.
> **Watch out:** no component you ship may fetch. No `useEffect` outside `lib/browser`.

### G · Change detection
> Implement `server/src/modules/runs` per [05 §6](./05-SCRAPING.md) and
> [02 §3](./02-DATA-MODEL.md). Deliver: the `ScrapeRunner` implementation (the
> 14-step pipeline in [07 §4](./07-SCHEDULING.md)), run/snapshot/field-value
> persistence, all diff algorithms, change persistence, all 11 rule triggers,
> throttle/quiet-hours/digest/dedupe suppression **with recorded reasons**, run and
> change query routes, the time-series endpoint.
> **Watch out:** `previous_run_id` is the last *successful* run. Use `TestClock` for
> every time-based rule — this is the subtlest code in the system.

### H · Monitor UI
> Build `web/src/features/monitors`. The editor is **five components, not one**:
> `MonitorBasicsForm`, `ExtractorList`, `SchedulePicker`, `RulesBuilder`,
> `PreviewPanel` — each ≤150 lines, each independently testable, wired by one
> container. Live preview round-trips `POST /monitors/preview` (debounced,
> cancellable); build that first, it's the risky part. List rows carry a `PulseStrip`.

### I · Runs UI
> Build `web/src/features/runs`: run timeline, the diff viewer (word-level,
> inline/split, changed-only, `j`/`k` navigation), value charts using the Signal
> ramp, screenshot view, manual run, failure drill-down.
> **Watch out:** scraped content is untrusted. Render as text; sanitize with DOMPurify
> and use a sandboxed iframe if HTML is ever shown.

### J · Channels
> Add `slack`, `discord`, `telegram` adapters and build `web/src/features/channels`.
> The UI must be **generated from `GET /channels/kinds`** — forms, validation, icons,
> test button, all driven by the descriptor. If you find yourself special-casing a
> channel in the frontend, D's descriptor contract is incomplete: fix it there.

### K · Scheduling polish
> Digest builder job, quiet-hours queueing and flush, per-domain rate limits under
> real concurrency, auto-pause/auto-resume, monitor health scoring, heartbeat metrics.

### L · Landing page
> Build the marketing page per [15 §7](./15-DESIGN-SYSTEM.md): the animated hero
> (live pulse strip resolving into a rendered diff — the one orchestrated moment on
> the page), how-it-works, what-people-watch, the "not every change is news" section,
> channels, self-hosting, footer with version. Fully translated (`landing`
> namespace), static-renderable, ≤120 kB JS, LCP <1.5s, reduced-motion honored.
> **Watch out:** import nothing from `features/**` — the landing page must not pull
> the console bundle.

---

## 5. Definition of done — every stream

- [ ] `pnpm typecheck && pnpm lint && pnpm test` green from the repo root
- [ ] `pnpm i18n:check` green; every new string keyed in `en` **and** `cs`
- [ ] `pnpm gen:openapi && pnpm gen:api` produces no diff (backend streams)
- [ ] Module/feature `README.md`: purpose, public API, extension points, gotchas
- [ ] Module `README.md` documents every export — no comments in the code itself
- [ ] Unit tests for logic; integration tests for anything touching Postgres/Redis
- [ ] No `any`, no `process.env`, no `Date.now()`, no magic strings, no unmapped
      error tags, no `useEffect` outside `lib/browser`, no literal UI strings
- [ ] New env vars declared in `core/config` **and** [11-ENVIRONMENT](./11-ENVIRONMENT.md)
- [ ] Every route has `response` schemas, `operationId`, and `tags`
- [ ] **Docs updated in the same PR** where reality diverged from the plan — see §7
- [ ] One line added at the marked insertion point in the composition root

## 6. Coordination protocol

- **Branch per stream**: `stream/<letter>-<name>`. Rebase on `main` daily.
- **Contract amendments**: changing a Phase-0 type needs `docs/adr/NNN-*.md`
  describing the change and its blast radius, announced before merge.
- **Interface stubs**: when stream X needs something from stream Y, X defines the
  tag and interface in `core` and ships a stub layer; Y replaces it. This is why
  C/D/E/G could all start on day one.
- **Integration checkpoints I1 and I2 are serial and owned by one agent.**
- **Progress log**: each stream appends to `docs/progress/<stream>.md` — what landed,
  what's blocked, what contract it wants changed.

## 7. The documentation rule

**Every fix and every implementation updates the docs in the same change.** Not a
follow-up, not a ticket.

- Behavior differs from a doc → fix the doc.
- New env var, constant category, route, channel, or lint rule → document it where
  it belongs, not in a changelog.
- A Phase-0 contract changes → ADR under `docs/adr/`.
- A non-obvious decision gets its "why" recorded next to the "what" — a rule without
  a reason is a rule the next agent deletes.

Docs are the interface between agents who never share a context window. Stale docs
aren't untidiness here; they're a broken build that nothing catches.

## 8. Realistic concurrency

Six streams is the ceiling, not a target. With two or three agents, run:

**C (scraping) → E (jobs) → B (monitors) → G (changes) → D (notifications) → A (auth) → F → L/H/I/J**

Scraping and change detection are where the product's real difficulty lives. Auth
and CRUD are well-trodden. Front-load the parts where you'll learn something.
