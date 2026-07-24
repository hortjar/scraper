# Data Model

Postgres 17. All tables use `uuid` v7 primary keys (`id uuid primary key default
uuidv7()`), `created_at`/`updated_at timestamptz not null default now()`, and
soft-delete only where noted. Drizzle schema files live at
`packages/db/src/schema/<feature>.ts`, barrel-exported from `index.ts`.

> **Phase-0 rule:** the *entire* v1 schema below is written and migrated in Phase 0
> by a single agent. Feature agents in Phase 1 never edit schema files — this is
> what keeps parallel work collision-free.

## Entity map

```
users ──┬── sessions
        ├── api_keys
        ├── notification_channels ──┐
        └── monitors ──┬── extractors│
                       ├── notification_rules ──┘ (channel_id fk)
                       ├── runs ──┬── snapshots ── field_values
                       │          └── run_errors
                       └── changes ── notification_deliveries
```

---

## 1. Identity

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `email` | citext unique not null | case-insensitive |
| `email_verified_at` | timestamptz null | gate for notifications to own address |
| `password_hash` | text not null | Argon2id, see 08-AUTH |
| `display_name` | text null | |
| `timezone` | text not null default `'UTC'` | IANA; drives cron & quiet hours |
| `locale` | text not null default `'en'` | BCP-47. Drives API messages **and** the language of every notification sent to this user ([16-I18N](./16-I18N.md)) |
| `role` | enum(`user`,`admin`) default `user` | admin sees system health |
| `status` | enum(`active`,`suspended`) default `active` | |
| `plan_limits` | jsonb not null | `{maxMonitors, minIntervalSeconds, maxChannels}` — self-host defaults from env |

### `sessions`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | uuid fk → users **on delete cascade** | |
| `token_hash` | bytea unique not null | SHA-256 of opaque token; raw token never stored |
| `expires_at` | timestamptz not null | |
| `last_seen_at` | timestamptz not null | sliding refresh |
| `user_agent`, `ip` | text null | shown in "active sessions" UI |
| `revoked_at` | timestamptz null | |

Index: `(user_id, revoked_at)`, `(expires_at)` for the sweeper.

### `api_keys`
`id`, `user_id`, `name`, `prefix` (8 chars, shown in UI), `key_hash` (bytea),
`scopes` (text[]), `last_used_at`, `expires_at`, `revoked_at`.

### `verification_tokens`
`id`, `user_id`, `purpose` enum(`email_verify`,`password_reset`,`channel_verify`),
`token_hash`, `expires_at`, `consumed_at`, `meta` jsonb.
Single-use, short TTL. One table for all one-shot tokens.

---

## 2. Monitoring configuration

### `monitors`
The central entity — "a page, watched".

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | uuid fk → users cascade | |
| `name` | text not null | |
| `url` | text not null | validated: http(s) only, public host, no credentials |
| `engine` | enum(`http`,`browser`,`auto`) default `auto` | `auto` starts http, escalates once and pins the result |
| `request` | jsonb not null default `'{}'` | `{method, headers, cookies, body, userAgent, followRedirects, timeoutMs}` |
| `browser_options` | jsonb not null default `'{}'` | `{waitUntil, waitForSelector, waitMs, viewport, blockResources[], steps[]}` |
| `schedule_kind` | enum(`interval`,`cron`) not null | |
| `schedule_value` | text not null | seconds, or a 5-field cron expr |
| `schedule_timezone` | text not null | defaults to user's tz |
| `jitter_seconds` | int not null default 30 | avoids thundering herd on the target |
| `enabled` | boolean not null default true | |
| `status` | enum(`ok`,`degraded`,`failing`,`paused`) default `ok` | derived, updated by worker |
| `consecutive_failures` | int not null default 0 | auto-pause threshold from env |
| `content_selector` | text null | root scope for extraction; empty = whole document |
| `ignore_rules` | jsonb not null default `'[]'` | selectors/regex stripped before hashing — kills false positives from timestamps, CSRF tokens, ads |
| `last_run_at`, `next_run_at` | timestamptz null | denormalized for list views |
| `last_change_at` | timestamptz null | |
| `tags` | text[] not null default `'{}'` | |
| `archived_at` | timestamptz null | soft delete |

Indexes: `(user_id, archived_at)`, `(enabled, next_run_at)`, `gin(tags)`.

### `extractors`
What to pull out of the page. Ordered, one row per field.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `monitor_id` | uuid fk cascade | |
| `key` | text not null | stable identifier used in templates: `{{price}}` |
| `label` | text not null | UI display |
| `selector_kind` | enum(`css`,`xpath`,`jsonpath`,`regex`,`json_ld`,`whole_page`) | |
| `selector` | text not null | |
| `attribute` | text null | `text` (default), `html`, or an attribute name like `href`/`content` |
| `value_type` | enum(`text`,`number`,`price`,`boolean`,`url`,`date`,`list`) | drives comparison semantics |
| `transforms` | jsonb not null default `'[]'` | ordered pipeline, see 05-SCRAPING §4 |
| `occurrence` | enum(`first`,`last`,`all`,`nth`) default `first` | + `occurrence_index` int |
| `required` | boolean not null default true | missing required field ⇒ run error, not a "change to null" |
| `position` | int not null | display + evaluation order |

Unique: `(monitor_id, key)`.

**Why `required` matters:** a site redesign silently breaking a selector must
surface as an *error*, never as "price changed to nothing" firing a false alert.
This is the single most common failure mode of naive scrapers.

### `notification_rules`
When a change is worth telling someone about, and where to send it.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `monitor_id` | uuid fk cascade | |
| `channel_id` | uuid fk → notification_channels restrict | |
| `name` | text not null | |
| `trigger_kind` | enum | `any_change`, `field_changed`, `numeric_threshold`, `percent_change`, `text_contains`, `text_not_contains`, `regex_match`, `availability`, `run_failed`, `run_recovered`, `no_change_for` |
| `trigger_config` | jsonb not null | shape per kind, validated by Effect Schema union |
| `extractor_key` | text null | which field it watches (null = whole page / run-level) |
| `delivery_mode` | enum(`immediate`,`digest`) default `immediate` | |
| `digest_cron` | text null | e.g. daily 08:00 in user tz |
| `throttle_seconds` | int not null default 0 | min gap between sends for this rule |
| `quiet_hours` | jsonb null | `{start:"22:00", end:"07:00", tz}` — queued, not dropped |
| `enabled` | boolean not null default true | |

Index: `(monitor_id, enabled)`.

**Notification fatigue is the #1 reason people abandon monitoring tools.** The
research on competitor-price tooling is consistent: users want *immediate* alerts
for meaningful moves (">5% drop"), a *daily digest* for small ones, and silence
otherwise. `throttle_seconds`, `digest`, and `quiet_hours` exist for that.

### `notification_channels`
Where a user can be reached. Not monitor-specific — reusable.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | uuid fk cascade | |
| `kind` | text not null | registry key: `email`, `webhook`, `slack`, `discord`, `telegram`, … **text, not enum** — adding a channel must not require a migration |
| `name` | text not null | |
| `config` | jsonb not null | non-secret fields in clear (e.g. `{to}`) |
| `secret` | bytea null | AES-256-GCM ciphertext of the secret fields |
| `secret_iv`, `secret_tag` | bytea null | |
| `verified_at` | timestamptz null | set after a successful test send |
| `enabled` | boolean not null default true | |
| `failure_count` | int not null default 0 | auto-disable after N consecutive hard failures |

Unique: `(user_id, name)`.

---

## 3. Execution records

### `runs`
One row per scrape attempt.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `monitor_id` | uuid fk cascade | |
| `trigger` | enum(`schedule`,`manual`,`retry`,`test`) | |
| `status` | enum(`running`,`success`,`failed`,`skipped`) | |
| `strategy_used` | enum(`http`,`browser`) | what `auto` resolved to |
| `started_at`, `finished_at` | timestamptz | |
| `duration_ms` | int | |
| `http_status` | int null | |
| `bytes` | int null | |
| `content_hash` | bytea null | SHA-256 of normalized content — fast "nothing changed" path |
| `changed` | boolean not null default false | |
| `error_kind` | text null | tagged error `_tag` |
| `error_message` | text null | redacted |
| `attempt` | int not null default 1 | |
| `job_id` | text null | BullMQ id, for support/debugging |

Indexes: `(monitor_id, started_at desc)`, partial `(monitor_id) where changed`.
**Retention:** rows older than `RUN_RETENTION_DAYS` deleted by the sweeper.

### `snapshots`
The captured content for a run. Split from `runs` because it's big and has a
shorter retention.

`id`, `run_id` fk cascade, `monitor_id`, `content` text (normalized text/markdown),
`raw_ref` text null (object-store key or path for full HTML/screenshot),
`screenshot_ref` text null, `size_bytes`, `created_at`.

Only stored when the content hash changed, plus the most recent snapshot always
kept — that's all diffing needs, and it cuts storage by orders of magnitude on
stable pages.

### `field_values`
`id`, `run_id` fk cascade, `monitor_id`, `extractor_key`, `raw` text null,
`value_text` text null, `value_number` numeric null, `value_bool` boolean null,
`missing` boolean not null default false.

Typed columns (not just JSON) so threshold rules and charts are plain SQL.
Index `(monitor_id, extractor_key, run_id desc)` powers the history sparkline.

### `changes`
One row per detected, meaningful delta.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `monitor_id`, `run_id` | uuid fk cascade | |
| `previous_run_id` | uuid null | what it was compared against |
| `extractor_key` | text null | null = whole-page change |
| `change_kind` | enum(`appeared`,`disappeared`,`modified`,`increased`,`decreased`) | |
| `old_value`, `new_value` | text null | |
| `old_number`, `new_number` | numeric null | |
| `delta_absolute`, `delta_percent` | numeric null | precomputed for rules & UI |
| `diff` | jsonb null | word/line diff hunks for text |

Index: `(monitor_id, created_at desc)`.

### `notification_deliveries`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `rule_id`, `channel_id`, `monitor_id` | uuid fk | |
| `change_ids` | uuid[] | a digest covers many changes |
| `status` | enum(`pending`,`sent`,`failed`,`suppressed`) | `suppressed` = throttled/quiet-hours/duplicate |
| `suppressed_reason` | text null | shown in UI so silence is never mysterious |
| `attempts` | int not null default 0 | |
| `last_error` | text null | |
| `provider_message_id` | text null | |
| `payload_preview` | jsonb | exactly what was rendered, for support |
| `sent_at` | timestamptz null | |

Index: `(rule_id, created_at desc)`, `(status) where status = 'pending'`.

### `audit_log`
`id`, `user_id` null, `actor_kind` enum(`user`,`system`,`api_key`), `action`,
`subject_kind`, `subject_id`, `meta` jsonb, `ip`, `created_at`.
Written for auth events, monitor create/update/delete, channel changes.

---

## 4. Derived / operational

- **`monitor_stats`** (materialized view, refreshed every 5 min): per-monitor
  run count, success rate, avg duration, change count over 24h/7d/30d. The
  dashboard reads this, never aggregates `runs` live.
- **Partitioning**: `runs`, `field_values`, and `snapshots` are declared
  `PARTITION BY RANGE (created_at)` monthly from day one. Adding partitioning
  later to a hot table is painful; doing it up front costs one migration.

## 5. Invariants enforced in the DB

1. `monitors.schedule_value` interval ≥ `plan_limits.minIntervalSeconds` (check trigger).
2. Deleting a `notification_channel` still referenced by an enabled rule is **restricted** —
   the UI must ask the user to reassign first, rather than silently muting alerts.
3. `field_values` has exactly one non-null typed column per `value_type` (check constraint).
4. `sessions.expires_at > created_at`.
5. All `user_id`-scoped tables carry `user_id` directly (denormalized on `runs`,
   `changes` via `monitor_id` join only where cheap) so every query can filter
   ownership at the index level — the tenancy boundary is never a join away.
