# Authentication & Authorization

Module: `packages/server/src/modules/auth`. Custom, Effect-native — no third-party auth dependency.

## 1. Model

**Opaque session tokens in httpOnly cookies**, not JWTs in localStorage.

Rationale: sessions are revocable instantly (a JWT is valid until it expires),
`httpOnly` puts the token out of reach of XSS, and we already have Postgres so
there is no statelessness to buy. The cost — one indexed lookup per request — is
sub-millisecond and cached.

```
POST /auth/login
  ├─ verify password (Argon2id)
  ├─ token = base64url(random 32 bytes)
  ├─ store sha256(token) in sessions
  └─ Set-Cookie: sid=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=…
```

- Cookie name `SESSION_COOKIE_NAME` (default `sid`), `Secure` unless `APP_ENV=development`.
- Sliding expiry: `last_seen_at` refreshed at most once per 5 minutes; absolute
  cap at `SESSION_ABSOLUTE_TTL` (30 days).
- Logout revokes the row. "Log out everywhere" revokes all rows for the user.
- Active sessions (device, IP, last seen) are listed in settings and individually revocable.

## 2. Passwords

- **Argon2id** via `@node-rs/argon2` (Bun-compatible), parameters from config:
  `memoryCost 19456 KiB, timeCost 2, parallelism 1` (OWASP baseline), tunable per deployment.
- Minimum 12 characters. No composition rules — length and a **breach check against
  the k-anonymity HIBP range API** (optional, `PASSWORD_BREACH_CHECK=true`, fails open).
- Rehash on login when parameters change.
- Constant-time comparison; login timing equalized by hashing a dummy password when
  the user doesn't exist, so the endpoint can't enumerate accounts.
- Reset flow: single-use token (15 min TTL, hashed at rest), revokes all sessions on
  successful reset, and the response is identical whether or not the email exists.

## 3. Email verification

Unverified accounts can log in and configure monitors but **cannot receive
notifications to unverified addresses** — that's the anti-abuse control that
matters (an unverified mail channel makes this service a spam relay).

## 4. Guards

An Elysia macro provides typed request context:

```ts
export const requireUser = new Elysia({ name: 'auth/requireUser' })
  .use(effectPlugin)
  .macro({
    auth: (enabled: boolean) => ({
      async resolve({ cookie, headers, runFx }) {
        const user = await runFx(Sessions.authenticate({ cookie: cookie.sid.value, headers }))
        return { user }        // typed, non-nullable, in every downstream handler
      },
    }),
  })
```

- Accepts either a session cookie **or** `Authorization: Bearer <api-key>`;
  API keys carry `scopes` and are rejected on session-only routes (like changing a password).
- **Resource authorization is in the service layer, not the route.** Every service
  method takes `userId` and filters at the query level — there is no code path that
  loads a monitor and then checks ownership, because that's how IDOR bugs happen.
- `role: admin` gates `/admin/*` (system health, queue board, user list).

## 5. Rate limiting & abuse

| Endpoint | Limit |
|---|---|
| `POST /auth/login` | 5 / 15 min per (IP, email), then exponential lockout |
| `POST /auth/register` | 3 / hour per IP |
| `POST /auth/password/reset` | 3 / hour per email, 10 / hour per IP |
| Authenticated API | 600 / min per user |
| `POST /monitors/preview` | 10 / min per user (it performs a live fetch) |

Implemented as a Redis sliding window in `auth.rate-limit.ts`, returning
`RateLimited` with `Retry-After`. CAPTCHA is deliberately not in v1; if abuse
appears on a public instance, a Turnstile hook point exists at registration.

## 6. CSRF & headers

- `SameSite=Lax` blocks the classic cross-site form post. State-changing requests
  additionally require `Origin` to match `APP_URL` — a cheap, stateless double check.
- The SPA is served from the same origin as the API in the default deployment, so
  no CORS is needed. When `CORS_ORIGINS` is set, credentials are only allowed for
  explicitly listed origins (never `*`).
- Security headers via a plugin: `Strict-Transport-Security`, `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a
  CSP without `unsafe-inline` (Vite build supports nonce/hashes).

## 7. API keys

For users driving the platform programmatically (creating monitors from CI, pulling
results into a warehouse).

- Format `sk_<8-char prefix>_<32-byte base64url>`; only the prefix and a hash are stored.
- Shown once at creation. Scopes: `monitors:read`, `monitors:write`, `runs:read`, `channels:write`.
- `last_used_at` tracked; unused keys flagged in the UI after 90 days.

## 8. Audit trail

Written to `audit_log` for: register, login success/failure, logout, password
change/reset, session revoke, API key create/revoke, channel create/update/delete,
monitor create/delete, robots override. Surfaced in settings as "recent security activity".

## 9. Threat model — what we're defending against

| Threat | Control |
|---|---|
| Credential stuffing | Rate limits + lockout + breach check + no user enumeration |
| XSS stealing sessions | `httpOnly` cookies, CSP, React escaping, no `dangerouslySetInnerHTML` outside the sanitized diff viewer |
| CSRF | `SameSite=Lax` + Origin check |
| IDOR | Ownership filtered in every query, enforced at the service layer |
| SSRF via monitor URLs / webhooks | Shared guard: scheme, host, private-range, DNS-rebinding, redirect re-validation |
| Secret exfiltration via API | Secrets encrypted; never serialized into any response DTO |
| Stored XSS via scraped content | Scraped content rendered as text; the diff viewer sanitizes with DOMPurify and renders in a sandboxed iframe when showing HTML |
| Log leakage | Redaction layer strips known secret keys and cookie headers |
