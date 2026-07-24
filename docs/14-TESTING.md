# Testing Strategy

The goal is not a coverage number. It's that **a change to the transform pipeline,
the diff algorithm, or a rule trigger cannot silently start sending wrong alerts.**
Those three are where bugs are expensive and where the tests are densest.

## 1. The pyramid, concretely

| Layer | Tool | Runs in | What |
|---|---|---|---|
| Unit | Vitest + `@effect/vitest` | ms, no I/O | Transforms, extraction, diffing, rule evaluation, normalization, value objects |
| Service | Vitest + stub layers | ms | Service logic with `Test` layers for repos and external I/O |
| Integration | Vitest + Testcontainers | seconds | Repositories, migrations, routes with real Postgres + Redis |
| Contract | Vitest | ms | OpenAPI snapshot; webhook envelope snapshot |
| E2E | Playwright | minutes | Golden user paths against the composed stack |

## 2. Effect-specific practice

```ts
it.effect('suppresses a second alert inside the throttle window', () =>
  Effect.gen(function* () {
    const rules = yield* RuleEvaluator
    yield* rules.evaluate(change)                        // sends
    yield* TestClock.adjust('30 seconds')
    const second = yield* rules.evaluate(change)         // throttle = 60s
    assert.deepStrictEqual(second, Suppressed('throttled'))
  }).pipe(Effect.provide(TestLayer)))
```

- **`TestClock` everywhere time matters** — throttles, quiet hours, digest windows,
  session expiry, backoff. Never `setTimeout` in a test, never a real sleep.
- **Stub layers, not mocks.** `MonitorRepository.Test` is a real implementation over
  an in-memory `Map`. It gets exercised by every service test, so it stays honest.
- Assert on the **error channel**: `Effect.flip` + tag equality. A test that only
  checks the happy path leaves the interesting half unverified.
- `@effect/vitest`'s `it.scoped` for anything acquiring resources, so leaks fail tests.

## 3. Scraping tests

Golden files are the backbone:

```
packages/scraping/test/fixtures/
├── amazon-product.html        → expected/amazon-product.json
├── saas-pricing.html          → expected/saas-pricing.json
├── json-ld-product.html       → expected/json-ld-product.json
├── spa-shell.html             → triggers auto-escalation
└── broken-selector.html       → expects ExtractorMissing, NOT a change
```

Adding a supported site pattern means adding a fixture pair. When a transform
changes, the diff in the expected JSON *is* the review.

Plus:
- Property tests: `normalize(normalize(x)) === normalize(x)`; transform pipelines
  never throw on arbitrary strings.
- A local **fixture server** (`test/server`) serving a static page and a
  JS-rendered page, mutable at runtime, for integration and E2E. **No test ever
  hits a third-party website** — those change and go down, and a flaky suite gets ignored.
- Browser-strategy tests run against the fixture server through the real `browser`
  container, tagged `@browser` and excluded from the fast suite.

## 4. Notification tests

- Each channel: success, retryable failure (429/503 → retry), terminal failure
  (400 → no retry), truncation at `maxLength`, secret redaction in the stored preview.
- Dispatcher: dedupe, throttle, quiet-hours queueing, digest aggregation, circuit
  breaking at `CHANNEL_FAILURE_LIMIT`.
- A **registry conformance suite** every channel is run through automatically:
  config schema round-trips, secret fields are declared, `describe()` produces a
  renderable descriptor. Adding a channel to `ChannelSet` opts it into these tests —
  a new channel can't ship half-wired.

## 5. Integration tests

Testcontainers spins Postgres + Redis per suite (reused across files via a global
setup). Each test runs in a **transaction rolled back at teardown**, so tests are
order-independent and parallel-safe.

Covered: migrations apply cleanly to an empty DB *and* to the previous release's
schema; every repository method; ownership isolation (user A cannot read user B's
monitor through any route — a parameterized test over every `:id` route, because
IDOR bugs are systematic, not incidental); route validation and error mapping.

## 6. E2E golden paths

1. Register → verify email (token pulled from the `console` mail driver) → log in.
2. Create a monitor against the fixture server → preview shows extracted values →
   save → trigger a manual run → run appears with correct field values.
3. Mutate the fixture → run again → change detected → webhook received at a local
   sink with a **valid HMAC signature** → diff renders in the UI.
4. Set a threshold rule that shouldn't fire → mutate below threshold → assert a
   `suppressed` delivery with the reason shown in the UI. *(Testing that alerts
   **don't** fire is as important as testing that they do.)*
5. Revoke a session in settings → the other browser context is logged out.

E2E runs against `docker-compose` in CI, not against dev servers, so it exercises
the images that ship.

## 6b. Frontend specifics

- **Presentational components test without any network.** That's the payoff of the
  container/presentational split — no MSW, no providers, just props in and DOM out.
- Containers test with MSW seeded from the generated client's types.
- Every blessed `lib/browser` primitive has a test — they're the only code allowed
  to hold effects, so they carry the risk for the whole app.
- Render every screen once under the **pseudo-locale** (`en-XA`) in a visual check:
  it catches truncation and any string that escaped i18n.
- Accessibility: `vitest-axe` on each organism, plus a Playwright axe pass on the
  landing page, dashboard, monitor editor, and diff viewer.

## 7. What we don't test

- shadcn primitives (upstream's job) — we test our composites.
- Drizzle's SQL generation — we test our queries' results.
- Third-party channel providers — adapters are tested against a stubbed `HttpClient`;
  a `console`/sink driver covers the wiring.

## 8. Gates

| Gate | Threshold |
|---|---|
| Typecheck, lint | zero errors |
| Lint rules that encode the plan | no `useEffect` outside `lib/browser`, no literal UI strings, no `process.env` outside `core/config`, no cross-module deep imports, no magic strings in the audited categories |
| `pnpm i18n:check` | no missing keys in any locale |
| `pnpm gen:openapi && pnpm gen:api` | produces no diff (client/server drift) |
| `size-limit` | landing ≤120 kB, console ≤200 kB gzip |
| Unit coverage: `scraping`, `runs`, `notifications` | ≥ 80% lines, ≥ 70% branches |
| Unit coverage: everything else | ≥ 60% |
| Integration | all green, no `.skip` without a linked issue |
| E2E | all golden paths green |
| OpenAPI snapshot | no unintended breaking change |
| `pnpm audit` | no high/critical |

Flaky tests get quarantined with an issue and a deadline, never `.skip`-ed silently.
A suite people don't trust is worse than no suite.
