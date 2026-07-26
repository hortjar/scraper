# Discord channel

## Setup

1. In the target Discord channel: **Edit Channel → Integrations → Webhooks →
   New Webhook**, then copy the webhook URL.
2. Paste it into `webhookUrl`. Treated as a secret — encrypted at rest, never
   returned by the API.
3. Use "Send test notification" to confirm delivery.

## Rendering

A single embed: title (the rendered subject), description (the markdown
summary), a link back to the run, and one field per changed value. The
sidebar color reflects the first change's direction — green for a decrease,
amber for an increase, blue for a new value appearing, gray for one
disappearing, and Discord's blurple as the neutral default (`render.ts`,
`DISCORD_COLOR`). This is a hint, not a verdict: a "decrease" isn't always
good news, but it is consistently the same color across every alert.

## Retry classification

Same as the webhook and Slack channels: `429`/`5xx`/network failures retry,
everything else (a revoked webhook returns `401`, a deleted one `404`) is
terminal.
