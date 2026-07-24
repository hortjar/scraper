# Scraping Engine

Module: `packages/server/src/modules/scraping`. Pure-as-possible, framework-free, heavily unit-tested.
It knows nothing about HTTP routes, queues, or notifications.

## 1. The strategy contract

One interface, many implementations. Adding a fetch method (a third-party scraping
API, a proxy pool, a headless service) means adding one file.

```ts
export interface ScrapeStrategy {
  readonly kind: StrategyKind                       // 'http' | 'browser' | …
  readonly canHandle: (m: MonitorConfig) => boolean
  readonly fetch: (req: ScrapeRequest) =>
    Effect.Effect<ScrapeResponse, ScrapeFailed, Clock | AppConfig>
}

export interface ScrapeResponse {
  readonly html: string
  readonly finalUrl: string
  readonly httpStatus: number
  readonly headers: Readonly<Record<string, string>>
  readonly screenshot?: Uint8Array
  readonly timings: { readonly totalMs: number; readonly ttfbMs?: number }
}
```

Strategies are registered in a `StrategyRegistry` service, resolved by
`monitor.engine`. `auto` runs `http` first and escalates to `browser` when the
[escalation heuristic](#3-auto-escalation) fires, then **pins** the outcome on the
monitor so the cost is paid once, not every run.

### `http` strategy
Bun's `fetch` + `cheerio`. Milliseconds, a few MB of RAM. Handles the majority of
targets — most pages still ship their content in the HTML.
- Honors `request.headers`, `cookies`, `method`, `body`, `timeoutMs`
- Sensible default UA identifying the tool + a contact URL (configurable)
- Follows redirects with **re-validation of every hop** against the SSRF guard
- Decompresses, detects charset, caps body size at `SCRAPE_MAX_BYTES`
- Sends `If-Modified-Since`/`If-None-Match` when we have them; a 304 short-circuits
  the whole run to "unchanged" — nearly free, and polite to the target

### `browser` strategy
Playwright over CDP to the `browser` container (`chromium.connectOverCDP`), so the
worker image stays small and browsers scale independently.
- New **browser context** per run (never a shared context) — isolation of cookies and storage
- `browser_options`: `waitUntil`, `waitForSelector`, `waitMs`, `viewport`, `blockResources[]`
- Blocks images/media/fonts by default — typically 3–5× faster, and the DOM is what we want
- Optional `steps[]`: a small typed action list (`click`, `fill`, `select`, `scroll`,
  `waitFor`) for cookie banners, "load more", and simple gated content
- Optional full-page screenshot when the monitor enables visual capture
- Hard wall-clock timeout; context and page always closed in `Effect.acquireRelease`

## 2. Extraction

```
ScrapeResponse ──► scope(content_selector) ──► for each extractor:
   select(selector_kind, selector, occurrence)
     └► read(attribute)  ──► transform pipeline ──► coerce(value_type) ──► FieldValue
```

Selector kinds: `css` (cheerio / Playwright locator), `xpath`, `jsonpath` (for
JSON endpoints and embedded JSON), `regex` (capture group 1), `json_ld`
(auto-parses `<script type="application/ld+json">` — the fastest path to
structured price/availability/rating data on e-commerce sites), `whole_page`.

Rules:
- A **missing required** extractor fails the run with `ExtractorMissing`. It never
  produces a change. This is the guard against selector rot creating false alerts.
- `occurrence: 'all'` yields a `list` value; list comparison is set-based
  (`appeared` / `disappeared` items), not string equality.
- Every extractor result keeps `raw` alongside the coerced value so the UI can show
  "we saw `$1,299.00 USD` → parsed `1299.00`".

## 3. Auto-escalation

`engine: 'auto'` escalates `http` → `browser` when, after HTTP extraction:
- all required extractors are missing, **or**
- the body is under `AUTO_ESCALATE_MIN_BYTES` and contains a known SPA root
  (`<div id="root">`, `__NEXT_DATA__`, `ng-app`), **or**
- the response is a challenge page (403/429 with a known interstitial signature).

The result is written to `monitors.engine_resolved`; escalation is attempted at most
once per 24h per monitor.

## 4. Transform pipeline

An ordered, serializable list applied to the raw string. Each step is a pure
function `(string, params) => Either<TransformError, string>`.

| Transform | Params | Use |
|---|---|---|
| `trim`, `lowercase`, `uppercase`, `collapse_whitespace` | — | normalization |
| `strip_html` | — | text from an HTML attribute |
| `regex_extract` | `pattern`, `group` | pull `1,299.00` out of `Only $1,299.00!` |
| `regex_replace` | `pattern`, `replacement` | remove noise |
| `slice` | `start`, `end` | |
| `parse_number` | `locale`, `decimal`, `thousands` | `1.299,00` → `1299` (EU formats matter) |
| `parse_price` | `currency?` | number + detected currency |
| `parse_date` | `format?`, `timezone` | to ISO |
| `map_values` | `{from: to}` | `"In stock"` → `true` |
| `default` | `value` | only for `required: false` extractors |
| `json_path` | `path` | after `regex_extract` grabbed an inline JSON blob |

Pipelines are validated at save time and previewed live in the editor.

## 5. Normalization & hashing

Before hashing or diffing, content is normalized so that irrelevant churn doesn't
register as change:

1. Scope to `content_selector` if set.
2. Apply `ignore_rules`: remove matching **selectors** (ads, carousels, "you may
   also like"), and blank matching **regexes** (timestamps, CSRF tokens, session
   ids, view counters, cache-busting query strings).
3. Strip `<script>`, `<style>`, comments, and all attributes except a safe list.
4. Collapse whitespace; convert to text (or markdown-ish text preserving block structure).
5. `content_hash = sha256(normalized)`.

If `content_hash` equals the previous run's, the run records `changed: false` and
exits before diffing — the common case, and it's cheap.

**Getting ignore rules right is the difference between a tool people keep and one
they mute.** Ship curated presets (cookie banners, common ad containers, relative
timestamps) and let users add their own with live preview of what remains.

## 6. Diffing → changes

Lives in the `runs` module, consuming the `scraping` module output.

- **text** — word-level diff (`diff` package) producing hunks with 2 lines of
  context; stored in `changes.diff` for the viewer.
- **number / price** — `delta_absolute`, `delta_percent`, direction; a change under
  a rule's threshold is still *recorded* but doesn't *notify* (so charts stay complete).
- **boolean / availability** — `appeared`/`disappeared` semantics.
- **list** — set difference: added items, removed items, reordering ignored by default.
- **whole page** — a single `modified` change with the text diff.

`previous_run_id` always points at the last **successful** run, so a transient
failure never manufactures a phantom "everything changed".

## 7. Politeness, ethics, and legality

Non-negotiable defaults, all overridable per-instance via env, and documented for
the operator:

- **robots.txt is fetched, cached (24h), and honored** by default. A user may
  override per monitor only if `ALLOW_ROBOTS_OVERRIDE=true`; the override is
  recorded in the audit log.
- **Crawl-delay** respected; per-domain rate limits enforced in the queue regardless.
- Minimum interval floor (`MIN_SCRAPE_INTERVAL_SECONDS`, default 300) — no one gets
  to hammer a site every 5 seconds through this tool.
- Identifiable User-Agent with a contact URL by default.
- **No stealth/anti-bot evasion ships in v1.** Fingerprint spoofing and CAPTCHA
  bypass are deliberately out of scope: they invite ToS and CFAA-adjacent exposure,
  and they're an arms race we'd lose to TLS fingerprinting anyway. Proxy support
  is a v2 item for *legitimate* geo-testing, configured by the operator.
- SSRF guard: reject non-`http(s)`, credentials-in-URL, private/loopback/link-local
  ranges, and `.local`/metadata hosts — re-checked after every redirect and after
  DNS resolution.
- The self-host docs state plainly: the operator is responsible for the ToS and
  data-protection posture of what they scrape.

## 8. Testing

- Golden-file tests: fixture HTML in, expected `FieldValue[]` out. Cheap to add,
  and they're the regression net when transforms change.
- A local fixture server (static site + a JS-rendered page) for integration tests
  and E2E — no test ever depends on a third-party website being up or unchanged.
- Property tests on the transform pipeline (idempotency of normalization; a
  normalized document normalizes to itself).
- `TestClock` for timeout and retry behavior.
