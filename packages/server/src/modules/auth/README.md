# auth

Identity. Owns users, sessions, API keys, verification tokens, the password policy,
the audit trail, and the `requireUser` macro every other module's routes depend on.

Design: [docs/08-AUTH.md](../../../../../docs/08-AUTH.md).

## Two modes

`AUTH_MODE` selects who owns identity.

| Mode              | Behaviour                                                              |
| ----------------- | ---------------------------------------------------------------------- |
| `local` (default) | Scraper owns users, hashes passwords, issues its own sessions          |
| `universal`       | Identity delegated to `admin-app`; access tokens verified against JWKS |

Both exist because a self-hosted instance must run standalone for someone who does
not also want to run an identity provider.

In `universal` mode, **registration and password login are disabled** — the IdP owns
accounts, so offering a second way in would fork the source of truth. Those routes
return `LocalAuthDisabled` (403) rather than 404, so the UI can say why. A subject
seen for the first time is JIT-provisioned into `users` so foreign keys resolve.

### Vendoring

`universal/` is a port of `@universal-admin/auth-client@0.2.0`, which lives in
`admin-app` and is **not published to npm**. It was rewritten to this repo's
conventions rather than depended on. If that package is ever published, this
directory is the thing to delete.

Verification is against the IdP's `/.well-known/jwks.json` with **both** `issuer` and
`audience` checked. Never against key material — a version that verifies with a
shared secret still passes tests, and would let any downstream app mint tokens for
every other one.

## `requireUser`

The single most important export. It accepts **either** a session cookie or
`Authorization: Bearer <api-key>`, resolves an `AuthActor`, and puts it in the
handler context. Options gate further: `sessionOnly` rejects API keys (used for
password changes), `scopes` requires API-key scopes, `role` gates admin, and
`verifiedEmail` requires a confirmed address.

Authorization decisions live in the service layer, not the route. Every service
method takes a `userId` and filters at the query level; nothing loads a row and then
checks who owns it.

## Traps found by running this against a real database

Both of these typecheck and pass unit tests. Only booting the stack catches them.

### API key secrets are base64url, so they contain `_`

The key format is `sk_<8-char prefix>_<32-byte base64url secret>`. Splitting on `_`
to recover the prefix produces four segments whenever the random secret happens to
contain an underscore — which is most of the time — and authentication then fails
for that key and no other. `parseApiKey` uses a capture group on
`PATTERN.apiKeyFormat` instead of `String.split`. `api-keys.parse.test.ts` pins it.

### A Date parameter in a postgres.js tagged template throws under Bun

Interpolating a `Date` into a tagged-template query fails with
`ERR_INVALID_ARG_TYPE … Received an instance of Date`. Drizzle serializes dates
itself, so ORM paths are fine and only this module's raw SQL is affected — every
session touch, key revocation and token consumption was a 500. Timestamp parameters
go through `sqlTimestamp()` from `auth.database.ts`, which hands postgres an ISO
string.

## Bootstrap

`bootstrapAdmin` creates `ADMIN_EMAIL` / `ADMIN_PASSWORD` idempotently and is only
meaningful in `local` mode. It is exported as an effect; `apps/api/src/main.ts` calls
it after migrations.

Note `packages/db/scripts/seed.ts` inserts `dev@example.com` with
`passwordHash = "!"`, a deliberately unusable hash. It owns demo monitors and is not
an account — do not "fix" it into one.
