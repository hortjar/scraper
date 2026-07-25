# Notification System

Module: `packages/server/src/modules/notifications`. **Modularity here is a hard requirement:**
adding a channel must touch one new directory and one registration line — no
migration, no changes to rules, dispatch, UI plumbing, or the API surface.

## 1. The channel contract

```ts
export interface NotificationChannel<Config = unknown> {
  /** Registry key, stored in notification_channels.kind. Stable forever. */
  readonly kind: string
  readonly displayName: string
  readonly description: string
  /** Icon name resolved by the frontend registry. */
  readonly icon: string

  /** Effect Schema for the channel config. Drives validation AND the settings form. */
  readonly configSchema: Schema.Schema<Config, unknown>
  /** Field paths encrypted at rest and never returned by the API. */
  readonly secretFields: readonly string[]

  readonly capabilities: {
    readonly richText: boolean // markdown/blocks vs plain text
    readonly attachments: boolean // screenshots
    readonly maxLength: number
    readonly supportsDigest: boolean
    readonly supportsVerification: boolean
  }

  /** Send a rendered message. Failure must classify itself as retryable or not. */
  readonly send: (
    ctx: SendContext<Config>,
  ) => Effect.Effect<DeliveryReceipt, DeliveryFailed, ChannelDeps>

  /** Optional: prove the config works (test send / API ping). */
  readonly verify?: (config: Config) => Effect.Effect<void, DeliveryFailed, ChannelDeps>

  /** Optional: channel-specific rendering. Falls back to the generic renderer. */
  readonly render?: (msg: NotificationMessage, config: Config) => ChannelPayload
}
```

`ChannelDeps` is deliberately small — `HttpClient | Mailer | AppConfig | Clock`.
A channel that needs more than that is doing too much.

## 2. Registry

```ts
export class ChannelRegistry extends Effect.Service<ChannelRegistry>()(
  SERVICE_TAG.ChannelRegistry,
  {
    effect: Effect.gen(function* () {
      const channels = yield* ChannelSet // ← the only extension point
      const byKind = new Map(channels.map((c) => [c.kind, c]))
      return {
        get: (kind: string) => Option.fromNullable(byKind.get(kind)),
        list: () => [...byKind.values()],
        /** Powers GET /channels/kinds — the UI builds its forms from this. */
        describe: () => [...byKind.values()].map(toChannelDescriptor),
      } as const
    }),
  },
) {}
```

The frontend **generates channel settings forms from `describe()`**. A new channel
therefore appears in the UI with a working form, validation, and a test button
without any frontend change at all. That is the modularity requirement, satisfied
concretely rather than aspirationally.

## 3. Adding a channel — the whole procedure

```
packages/server/src/modules/notifications/channels/ntfy/
├── config.ts     Schema.Struct({ serverUrl, topic, token: Redacted, priority })
├── channel.ts    the NotificationChannel implementation
├── render.ts     optional channel-specific formatting
├── channel.test.ts
└── README.md
```

Then one line in `channels/index.ts`:

```ts
export const ChannelSetLive = Layer.succeed(ChannelSet, [
  emailChannel,
  webhookChannel,
  slackChannel,
  discordChannel,
  telegramChannel,
  ntfyChannel, // ← that's it
])
```

Checklist for a new channel:

- [ ] `configSchema` with `secretFields` declared
- [ ] `send` classifies failures: 4xx (except 429) → terminal, 429/5xx/network → retryable
- [ ] `verify` implemented if the provider allows a cheap ping
- [ ] Respects `capabilities.maxLength` by truncating with a link back to the run
- [ ] Unit test with a stubbed `HttpClient`, covering success, retryable, terminal
- [ ] `README.md`: setup steps a user follows (where to get the token/webhook URL)

## 4. v1 channels

| Kind       | Config                               | Notes                                                                                                                                                                                        |
| ---------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `email`    | `to`                                 | SMTP or a provider API via `Mailer`; HTML + text parts; unsubscribe/manage link                                                                                                              |
| `webhook`  | `url`, `secret`, `headers`, `method` | **HMAC-SHA256** signature in `X-Scraper-Signature` + `X-Scraper-Timestamp`; stable JSON envelope. This is the escape hatch into Zapier/n8n/Make and the reason users can integrate anything. |
| `slack`    | `webhookUrl`                         | Block Kit rendering                                                                                                                                                                          |
| `discord`  | `webhookUrl`                         | Embeds with color by change direction                                                                                                                                                        |
| `telegram` | `botToken`, `chatId`                 | MarkdownV2                                                                                                                                                                                   |

Backlog: `ntfy`, `gotify`, `matrix`, `msteams`, `pushover`, web push, SMS.
An **Apprise**-backed adapter is a compelling single addition — one channel
implementation that unlocks 80+ services for self-hosters, at the cost of a
sidecar container. Tracked in [13-PRODUCT-BACKLOG](./13-PRODUCT-BACKLOG.md).

## 5. Message model & templating

```ts
interface NotificationMessage {
  readonly event: "change" | "digest" | "run_failed" | "run_recovered" | "test"
  readonly monitor: { id; name; url }
  readonly rule: { id; name }
  readonly changes: readonly ChangeSummary[]
  readonly run: { id; at; durationMs; strategy }
  readonly links: { monitor: string; run: string; unsubscribe: string }
  readonly screenshot?: { ref: string }
}
```

- Generic renderer produces `{ title, summaryText, summaryMarkdown, fields[], url }`;
  channels either use it or override with `render`.
- Users may supply a **custom template** per rule (Handlebars-style, sandboxed, no
  arbitrary code) with `{{monitor.name}}`, `{{change.old}}`, `{{change.new}}`,
  `{{change.deltaPercent}}`, `{{#each changes}}`. Preview in the UI renders against
  the rule's last real change.
- Every message carries a deep link to the run's diff. The single most-used part of
  any alert is "show me what changed" — one click, always.

## 6. Dispatch pipeline

```
change(s) ──► rule evaluation (runs module)
   └► suppression checks: enabled? verified? throttled? quiet hours? duplicate?
        ├─ suppressed ──► delivery row {status: suppressed, reason}   ← visible in UI
        └─ allowed
             ├─ immediate ──► enqueue notify job
             └─ digest    ──► append to digest bucket (Redis), flushed by digest cron
                              ↓
                        NotificationDispatcher
                              ↓
                render → send → receipt/failure
                              ↓
              delivery row updated; retries via BullMQ backoff
```

- **Retries**: 5 attempts, exponential backoff 30s → 8m, only for retryable failures.
- **Circuit breaking**: `channel.failure_count` increments on terminal failures;
  at `CHANNEL_FAILURE_LIMIT` (default 10) the channel auto-disables and the user
  gets an email about it (unless it _is_ the email channel, in which case it's an
  in-app banner).
- **Deduplication**: `(rule_id, content_hash_of_message)` in Redis with a TTL equal
  to `throttle_seconds` — a flapping page can't emit the same alert twice.
- **Suppression is always recorded.** A user must be able to answer "why didn't I
  get an alert?" from the UI. Silent drops destroy trust in a monitoring tool.
- **Quiet hours queue rather than discard**: messages are held and flushed at the
  window's end, collapsed into one digest.

## 7. Security

- Secret config fields are AES-256-GCM encrypted with a key derived from
  `ENCRYPTION_KEY` (32-byte, base64) via HKDF, per-row IV, tag stored separately.
- The API **never** returns secrets — only `hasSecret: true` and a masked hint.
- Webhook targets go through the same SSRF guard as scrape targets.
- Outbound webhook payloads are signed; the docs include a verification snippet.
- Rendered payloads are escaped per channel to prevent injection into Slack/Discord markup.
- `payload_preview` in `notification_deliveries` is stored **post-redaction**.
