# Webhook channel

The escape hatch into Zapier, n8n, Make, or any endpoint a user controls.

## Setup

1. Point the `url` field at an HTTPS endpoint you control (HTTP is allowed for
   local/self-hosted sinks, but the target must not resolve to a private,
   loopback, or denylisted host — see `url-guard.ts`).
2. Generate a random secret (16+ characters) and paste it into `secret`. It is
   encrypted at rest via `Crypto` and never returned by the API.
3. Optionally set `headers` (a JSON object merged into the request) and
   `method` (defaults to `POST`).
4. Use "Send test notification" to confirm delivery before enabling a rule.

## Verifying the signature

Every request carries:

```
X-Scraper-Event: change.detected
X-Scraper-Delivery: <delivery id>
X-Scraper-Timestamp: <unix seconds>
X-Scraper-Signature: sha256=<hmac>
```

The signature is `HMAC-SHA256(secret, "${timestamp}.${rawBody}")`, hex-encoded.
Recompute it server-side and compare with a constant-time check before trusting
the payload. The full envelope, with the exact field names, is documented in
[docs/09-API.md §6](../../../../../../docs/09-API.md#6-webhook-out-contract-for-webhook-channels).

## SSRF guard — a known gap, not an oversight

`url-guard.ts` blocks the obvious cases without a DNS lookup: loopback
hostnames, literal private IPv4 addresses, and a denylist of internal TLDs
(`.local`, `.internal`, …). **It does not resolve DNS**, so a hostname that
only resolves to a private address at request time is not caught. The
scraping module owns the real `UrlGuard` (`SERVICE_TAG.UrlGuard`) described in
[docs/05-SCRAPING.md](../../../../../../docs/05-SCRAPING.md); it did not exist yet when
this channel was built (`packages/server/src/modules/scraping` does not exist
on disk), so this module defines its own narrow, literal-only guard rather
than depend on something unbuilt. **Once scraping ships `UrlGuard`, swap
`guardWebhookUrl` for it** — the call sites (`deliver` in `channel.ts`) are the
only two places that need to change.

## Retry classification

- `429` or `5xx` → retryable (`DeliveryFailed.retryable = true`)
- Any other non-2xx → terminal
- Network failure or timeout → retryable
- A URL that fails the guard → terminal, and no request is ever sent
