# logs

Ships every log record from both processes somewhere the admin UI can read it.
`GET /admin/logs` is the reader; `logShipperLayer` is the writer.

## Two hops, on purpose

The API and the worker are separate containers, so "show me the worker's logs in
admin" needs a shared sink. Records go to a **capped Redis stream** on the hot
path, and a `drain-logs` maintenance task copies **warn and above** into
`app_logs` in postgres every 30 seconds.

That split is the whole design:

- **The hot path stays one `XADD`.** A scrape run emits a dozen records; none of
  them may cost a database round trip, and none of them may fail the thing being
  logged. The write is fire-and-forget and swallows its own errors — a logger that
  throws while logging is worse than a lost line.
- **The stream is capped** (`LOG_STREAM_MAXLEN`), so a log storm trims itself
  instead of filling Redis. That means the live tail is the recent past, not
  history, and the UI says so rather than implying completeness.
- **Only warn and above become rows.** Info-level records are the bulk of the
  volume and the least valuable a day later; failures are the opposite. The
  endpoint exposes both views (`?persisted=true`) rather than pretending one
  source answers every question.

A drained record is one that has been _copied_, not moved — the cursor advances in
Redis and the stream trims on its own schedule.

## The logger cannot await

Effect's `Logger` callback is synchronous, which rules out running an Effect
inside it. That is why the shipper holds a raw ioredis client and why persistence
is a separate maintenance task rather than a write inside the logger: there is no
correct place to await a database insert from a log call.

## Annotations are redacted and capped

The shipper reuses `redactValue` from core, the same function the JSON logger
uses, so `REDACTED_KEYS` applies to anything that reaches Redis, postgres or the
admin UI. Values are truncated (`MAX_ANNOTATION_CHARS`) so one log line carrying a
page body cannot dominate the stream.

## Why `RedisClient` moved

It used to live in `jobs`. `logs` needs it too, and `jobs`'s maintenance dispatcher
calls `drainLogs` — so `jobs → logs → jobs` was a cycle, and the symptom was an
undefined `.Default` at module init in an unrelated test. `RedisClient` is
infrastructure like `Database`, not job machinery, so it now has its own module and
both depend on it. The import-boundary lint rule is what surfaced this.
