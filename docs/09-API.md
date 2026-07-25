# API Contract

Base path `/api/v1`. JSON only.

**The OpenAPI document is the contract, not a by-product.** It is generated from
the route definitions, served as Swagger UI, and consumed by a code generator that
produces the entire frontend API layer. A route with a missing `response` schema or
`operationId` degrades the client for everyone — see §3.

| Endpoint | Serves |
|---|---|
| `/docs` | **Swagger UI** (`@elysiajs/openapi` with `provider: 'swagger-ui'`) |
| `/docs/scalar` | Scalar reference, for people who prefer it |
| `/docs/json` | OpenAPI 3.1 JSON — the machine-readable contract |

## 1. Conventions

- `snake_case` never appears on the wire — DTOs are `camelCase`; the DB mapper handles translation.
- Timestamps are ISO 8601 UTC strings. Durations are milliseconds, integers.
- IDs are UUIDv7 strings, branded in TypeScript.
- `POST` creates (201 + `Location`), `PATCH` partially updates, `PUT` is not used.
- Idempotency: `POST` accepts an optional `Idempotency-Key` header on monitor and
  channel creation.

### Error envelope

```json
{
  "code": "validation_failed",
  "messageKey": "errors.validationFailed",
  "messageParams": { "field": "url" },
  "message": "That URL can't be reached.",
  "requestId": "018f...",
  "issues": [{ "path": ["url"], "messageKey": "errors.privateHost", "message": "Host resolves to a private address" }]
}
```

- `code` — a stable machine string from `ERROR_CODE` ([03-BACKEND §3](./03-BACKEND.md)).
  Never parsed from `message`.
- `messageKey` + `messageParams` — so the client can render the sentence in the
  user's UI language without a round trip ([16-I18N §3](./16-I18N.md)).
- `message` — already rendered in the requester's locale, for API consumers that
  have no catalog.
- `issues` — 422 only, one entry per invalid field, mapped straight onto form fields.

### Pagination

Cursor-based on every list: `?limit=50&cursor=<opaque>` →
`{ "items": [...], "nextCursor": "…" | null, "total": 1234 }`.
Offset pagination is not offered — run lists grow without bound and offsets get
slow and inconsistent under concurrent inserts.

## 2. Route surface

### Auth — `auth` module
```
POST   /auth/register                 { email, password, displayName? } → 201
POST   /auth/login                    { email, password } → 200 + Set-Cookie
POST   /auth/logout                   → 204
GET    /auth/me                       → User
PATCH  /auth/me                       { displayName?, timezone? }
POST   /auth/email/verify/request     → 202
POST   /auth/email/verify             { token } → 204
POST   /auth/password/reset/request   { email } → 202  (always 202)
POST   /auth/password/reset           { token, password } → 204
PATCH  /auth/password                 { currentPassword, newPassword } → 204
GET    /auth/sessions                 → Session[]
DELETE /auth/sessions/:id             → 204
DELETE /auth/sessions                 → 204   (log out everywhere)
GET    /auth/api-keys                 → ApiKey[]
POST   /auth/api-keys                 { name, scopes, expiresAt? } → 201 { key }  (once)
DELETE /auth/api-keys/:id             → 204
```

### Monitors — `monitors` module
```
GET    /monitors                      ?q&tags&status&enabled&sort&limit&cursor
POST   /monitors                      CreateMonitor → 201
GET    /monitors/:id                  → MonitorDetail (incl. extractors, rules, stats)
PATCH  /monitors/:id                  UpdateMonitor
DELETE /monitors/:id                  → 204  (archive; ?purge=true hard-deletes)
POST   /monitors/:id/enable           → Monitor
POST   /monitors/:id/disable          → Monitor
POST   /monitors/:id/run              → 202 { runId }   (manual run, rate limited)
POST   /monitors/:id/duplicate        → 201
GET    /monitors/:id/extractors       → Extractor[]
POST   /monitors/:id/extractors       → 201
PATCH  /monitors/:id/extractors/:eid
DELETE /monitors/:id/extractors/:eid
POST   /monitors/preview              PreviewRequest → PreviewResult
GET    /monitors/:id/export           → MonitorConfig JSON
POST   /monitors/import               MonitorConfig[] → 201
```

`POST /monitors/preview` is the backbone of the editor: given a draft URL, engine,
and extractor list, it performs one live fetch and returns extracted values,
timings, resolved strategy, page title, a screenshot ref, and any warnings
(robots disallowed, JS-rendered content detected, selector matched 0 or >1 nodes).
It never persists anything.

### Runs & changes — the `runs` module
```
GET    /monitors/:id/runs             ?status&from&to&changedOnly → Run[]
GET    /runs/:id                      → RunDetail (field values, error, timings)
GET    /runs/:id/diff                 ?against=<runId> → DiffResult
GET    /runs/:id/snapshot             → { content, rawUrl?, screenshotUrl? }
GET    /monitors/:id/changes          → Change[]
GET    /monitors/:id/series           ?extractorKey&from&to&bucket → TimeSeries
GET    /changes                       cross-monitor activity feed
```

### Channels & rules — `notifications` module
```
GET    /channels/kinds                → ChannelDescriptor[]   ← UI builds forms from this
GET    /channels                      → Channel[]  (secrets masked)
POST   /channels                      { kind, name, config } → 201
PATCH  /channels/:id
DELETE /channels/:id                  → 409 if referenced by an enabled rule
POST   /channels/:id/test             → 202 { deliveryId }
GET    /monitors/:id/rules            → Rule[]
POST   /monitors/:id/rules            → 201
PATCH  /rules/:id
DELETE /rules/:id
POST   /rules/:id/preview             → rendered message for the last change
GET    /deliveries                    ?ruleId&channelId&status → Delivery[]
POST   /deliveries/:id/retry          → 202
```

### System
```
GET    /health        liveness — { status, version, commit, time }  ← version powers
                                  the client's skew banner (04-FRONTEND §8)
GET    /ready         readiness — DB + Redis reachable, workers heartbeating
GET    /metrics       Prometheus
GET    /meta          public: enabled channel kinds, locales, registration open?
GET    /admin/stats   admin only
GET    /admin/queues  Bull Board, admin only, feature-flagged
```

## 3. OpenAPI → generated client

```
Effect Schema route definitions
        │  @elysiajs/openapi + mapJsonSchema: { effect: JSONSchema.make }
        ▼
   OpenAPI 3.1  ──► /docs (Swagger UI)  ──► humans
        │
        │  @hey-api/openapi-ts
        ▼
apps/web/src/api/generated/   types · SDK · TanStack Query options
```

```ts
// openapi-ts.config.ts (repo root)
export default {
  input: 'apps/api/openapi.json',        // committed, regenerated by `pnpm gen:openapi`
  output: 'apps/web/src/api/generated',
  plugins: [
    '@hey-api/client-fetch',
    '@hey-api/typescript',
    { name: '@tanstack/react-query', queryOptions: true, mutationOptions: true },
  ],
}
```

**Spike S1 is resolved: this chain works, with one required detail.** Route schemas
must be wrapped in `Schema.standardSchemaV1(...)`. A bare `Schema.Struct` lacks the
`~standard` property Elysia checks for and is silently ignored — no error, just an
unvalidated route and an empty schema in the document. The wrapper preserves `.ast`,
so `JSONSchema.make` emits full JSON Schema. The TypeBox fallback is **not** needed.

Rules this imposes on route authors — all enforced in review and by a CI schema lint:

1. **Every route declares `response` schemas for every status it returns.** No
   schema means an `unknown` return type in the generated SDK.
2. **Every route declares a unique `operationId`** in `camelCase` (`listMonitors`,
   `createMonitor`). It becomes the generated function name.
3. **Every route declares `tags`** — they become the SDK's module grouping.
4. Schemas that are reused get a **named** Effect Schema so they emit as a
   `$ref` component instead of an inlined anonymous object.
5. `apps/api/openapi.json` is **committed**. CI regenerates it and the client, then
   fails if the tree is dirty — so a route change without a client regeneration
   can't merge, and an unintended breaking change shows up as a reviewable diff.

### DTO ↔ domain

DTOs live in each module's `*.schema.ts` and are **derived from domain models**
(`Schema.pick` / `Schema.omit` / `Schema.extend`) rather than hand-duplicated:

- A field added to a domain model doesn't silently leak into a response — the DTO
  explicitly picks it.
- `secret`, `passwordHash`, `tokenHash` can't appear in any DTO, by construction.
- The same schema validates the request server-side and the form client-side.

## 4. Realtime

v1 polls: TanStack Query with `refetchInterval` of 5s on an active run, 30s on
lists, paused when the tab is hidden. `GET /monitors/:id/runs` is cheap and indexed.

`GET /events` (SSE) with per-user `monitor.run.started/finished`, `change.detected`,
`delivery.sent` is specified but **not built in v1**. The client already routes all
server state through query keys, so switching to SSE means invalidating keys from
an event handler — a contained change, deliberately deferred.

## 5. Versioning

`/api/v1` from day one. Additive changes (new optional fields, new endpoints) ship
in v1. Breaking changes get `/api/v2` with v1 maintained for one minor cycle.
The OpenAPI document is committed and diffed in CI — an unintended breaking change
fails the build.

## 6. Webhook-out contract (for `webhook` channels)

```http
POST <user url>
X-Scraper-Event: change.detected
X-Scraper-Delivery: <uuid>
X-Scraper-Timestamp: 1753382400
X-Scraper-Signature: sha256=<hmac of `${timestamp}.${body}`>
```
```json
{
  "event": "change.detected",
  "monitor": { "id": "…", "name": "Competitor pricing", "url": "https://…" },
  "rule":    { "id": "…", "name": "Price drops >5%" },
  "run":     { "id": "…", "at": "2026-07-24T09:00:00Z", "durationMs": 812 },
  "changes": [{ "key": "price", "kind": "decreased", "old": "129.00", "new": "99.00",
                "deltaAbsolute": -30, "deltaPercent": -23.26 }],
  "links":   { "run": "https://…/runs/…", "monitor": "https://…/monitors/…" }
}
```

This envelope is a public contract — it is versioned with the API and changes only
additively. Verification snippets (Node, Python, n8n) live in the user guide.
