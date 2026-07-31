# runs

The change-detection pipeline. Consumes `scraping`, `monitors`, `jobs` and
`notifications`; owns `runs`, `field_values`, `changes` and `snapshots`. Specs:
[docs/05-SCRAPING.md](../../../../../docs/05-SCRAPING.md) §6 and
[docs/07-SCHEDULING.md](../../../../../docs/07-SCHEDULING.md) §4.

## The pipeline

`run-pipeline.ts` is the 14 steps of 07-SCHEDULING §4 in order. The shape worth
knowing:

- **Guards come before the run row.** A disabled or archived monitor gets a
  `skipped` run rather than silence, so "why did nothing happen?" is answerable from
  the UI.
- **The unchanged path exits early.** If the content hash matches the previous
  successful run, the run finishes `changed: false` without diffing, extracting
  changes or evaluating rules. That is the common case on most schedules and it is
  the reason the pipeline is cheap to run often.
- **`previousSuccessful` only considers runs with a content hash.** A transient
  failure therefore cannot manufacture a phantom "everything changed" — that is the
  rule stated in 05-SCRAPING §6 and it lives in the query, not in the caller.
- **A failure still finishes the run and still evaluates rules**, because
  `run_failed` and `run_recovered` are triggers. `failRun` does both, then re-fails
  so BullMQ can retry a retryable error.
- **`isOperatorFault`** (a `ScrapeFailed` with reason `browser_unavailable`) marks
  the monitor `degraded` and never counts toward auto-pause: the user did not break
  anything, the operator's browser container did.

`run-pipeline.mappers.ts` holds the pure part — row-to-snapshot conversion, the
per-extractor diff fan-out, error classification. Split out so the orchestration
file stays readable and the mapping is testable without a database.

## Diffing

`diff/field-diff.ts` dispatches on the extractor's `valueType`:

| type              | change kinds                     | carries                              |
| ----------------- | -------------------------------- | ------------------------------------ |
| `number`, `price` | `increased` / `decreased`        | old/new number, absolute, percent    |
| `boolean`         | `appeared` / `disappeared`       | old/new as text                      |
| `list`            | `appeared` **and** `disappeared` | set difference, reordering ignored   |
| everything else   | `modified`                       | old/new value plus a word-level diff |

Presence wins over type: a field that stopped being found is `disappeared`, never a
`modified` to null. `percentChange` divides by the **magnitude** of the previous
value, so a price moving −50 → −25 is +50%, not −50%.

A monitor with no extractors diffs the whole normalized page against the previous
run's snapshot, producing one keyless `modified` change.

`diff/text-diff.ts` keeps `DIFF_CONTEXT_LINES` lines of context around each change
and drops the interior of long unchanged stretches, so a one-word edit on a long
page stores a small diff instead of the whole document. Hunks are truncated at
`MAX_HUNK_CHARACTERS` and capped at `MAX_DIFF_HUNKS` — `changes.diff` is `jsonb`
and an unbounded diff is how you turn a monitoring tool into a disk-space incident.

## Rules

`rules/trigger-match.ts` implements all eleven `TRIGGER_KIND`s as one pure function.
It is split into `matchRunLevel` (the three that do not need changes) and
`matchChangeLevel`; the `undefined` return from the former means "not a run-level
trigger, keep going", which is different from `null`, "did not fire".

**A failed run suppresses every change-based trigger.** Required-extractor failures
must never be reported as changes (07-SCHEDULING §6).

`rules/suppression.ts` applies the suppression order from 06-NOTIFICATIONS §6 —
channel disabled, channel unverified, throttled, quiet hours, digest — and every
outcome writes a delivery row. Suppression is always recorded; a user has to be able
to answer "why didn't I get an alert?".

`messageHash` is the dedupe key from 07-SCHEDULING §5. Fields are joined with unit
and record separators rather than a space so that a value boundary shifting between
two fields cannot produce the same hash, and the list is sorted so change order does
not matter.

Quiet hours are evaluated in the **rule's** timezone via `Intl.DateTimeFormat`, not
the server's, and a window whose start equals its end is never quiet.

## Traps this module hit

- **A `Date` interpolated into a raw drizzle `sql` template throws under Bun** with
  `ERR_INVALID_ARG_TYPE`. Pass `isoTimestamp(date)` and put `::timestamptz` in the
  SQL text — not inside the interpolation, where it becomes part of the parameter and
  Postgres rejects `"2026-07-27T…Z::timestamptz"` as a malformed timestamp. Only raw
  templates are affected; drizzle's `.values()` and `.set()` serialize Dates fine.
- **`changes` needs `UNIQUE NULLS NOT DISTINCT`** on
  `(run_id, extractor_key, change_kind)` for the documented `ON CONFLICT DO NOTHING`
  to work at all, because `extractor_key` is null for whole-page changes and Postgres
  treats nulls as distinct by default. Migration `0002_change_dedupe.sql`.
- **BullMQ's `prefix` must match on both sides.** The producer set
  `JOB_PREFIX` and the workers did not, so the API wrote to `scraper:scrape` while
  the workers listened on `bull:scrape` and no job was ever processed. Nothing failed
  loudly — jobs simply sat in a queue nobody read.

## Known gaps

- **Nothing is ever delivered.** Rule evaluation inserts a `pending` delivery and
  enqueues `notify({ deliveryId })`, but the `notify` queue's handler is still
  `jobs/handlers/notify-runner.service.ts` — a stub that logs `job.notify.stub` and
  returns. Deliveries therefore accumulate as `pending` forever. Verified end to end on
  2026-07-31: a real content change produced `changed: true`, a `changes` row and a
  `pending` delivery, and then stopped. See `docs/18-HANDOFF.md` §4.
- Quiet-hours holds are written to `REDIS_KEY.digestBucket`, which only drains when a
  digest cron fires for that rule. Per-rule digest scheduling is stream **K**; until
  it lands, a quiet-hours suppression is recorded but not later delivered.
- `previousRunFailed` is derived from "there is no previous successful run", so
  `run_recovered` fires on a monitor's first successful run. Distinguishing "never ran"
  from "recovered" needs the previous run regardless of status.
- Screenshots are not stored; `snapshots.screenshot_ref` stays null until
  `SERVICE_TAG.ObjectStore` exists.
