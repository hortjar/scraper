# Slack channel

## Setup

1. In Slack, add an **Incoming Webhook** app to the target channel
   (`https://api.slack.com/messaging/webhooks`).
2. Copy the generated webhook URL (`https://hooks.slack.com/services/…`) into
   the `webhookUrl` field. It is treated as a secret — encrypted at rest, never
   returned by the API.
3. Use "Send test notification" to post a confirmation message.

## Rendering

Messages use [Block Kit](https://api.slack.com/block-kit): a `header` block
for the title, one `section` block per changed field (bold label, `old → new`
value), and a `context` block linking back to the run. `text` is set to the
plain-text summary so Slack's notification preview and screen readers still
get a readable line even before blocks render.

## Retry classification

Same as the webhook channel: `429`/`5xx`/network failures are retryable,
everything else (including a malformed webhook URL caught by the shared
SSRF guard) is terminal.
