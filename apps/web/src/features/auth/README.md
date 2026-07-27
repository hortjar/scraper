# features/auth

Session bootstrap, login/register/logout, the `/_app` route guard, password reset,
and the account section of `/settings` (profile, password, sessions, API keys).

Built on `apps/web/src/api` (the generated SDK) exactly like `features/system`:
`api.ts` wraps the generated `queryOptions`, hooks wrap mutations, components
render, containers wire the two together.

## Public API (`index.ts`)

- `LoginContainer`, `RegisterContainer`, `ForgotPasswordContainer`,
  `ResetPasswordContainer` — one container per `routes/_auth/*` screen.
- `ProfileSettingsContainer`, `PasswordSettingsContainer`,
  `SessionsSettingsContainer`, `ApiKeysSettingsContainer`, `LogoutButton` — the
  sections composed by `routes/_app/settings.tsx`.
- `checkSession`, `resolveAppGuardRedirect`, `LOGIN_PATH` — the pure pieces behind
  the `/_app` guard (see below).
- `useSession`, `SessionState` — read the signed-in user anywhere in the app.
- `CurrentUser` — the resolved `/auth/me` shape.

## Why validation.ts is hand-written, not RHF + an Effect Schema resolver

[docs/04-FRONTEND.md §10](../../../../../docs/04-FRONTEND.md) describes React Hook
Form with an Effect Schema resolver as the house pattern. Neither `react-hook-form`
nor a client-usable Effect Schema package is a dependency of `@scraper/web`
(`package.json` has neither), and the sibling `features/monitors` feature — the
only other form-heavy feature already in the tree — uses a hand-rolled
`useReducer`/`useState` shape instead. `validation.ts` (written before this pass)
already follows that established, working pattern: plain functions returning
`FieldErrors<Field>`, keyed by i18n message key. This feature continues it rather
than introducing a second, undependencied form stack. If RHF + Effect Schema
lands as a real dependency later, this is the module to migrate.

## The `/_app` guard: `beforeLoad`, not an effect

`routes/_app.tsx` calls `checkSession(context.queryClient)` in `beforeLoad` and
`redirect()`s to `/login` when it resolves `false` — `resolveAppGuardRedirect` is
the pure decision function, unit-tested in `guard.test.ts` without touching the
router or a real `QueryClient`. `checkSession` calls
`queryClient.ensureQueryData(sessionQueryOptions())`, so the guard and every
`useSession()`/`useQuery(sessionQueryOptions())` consumer share one cache entry —
a successful guard check means the session is already warm when the authenticated
shell renders.

That only works if the `beforeLoad` context and the `QueryClientProvider` around
the app use the **same** `QueryClient` instance. Before this change, `App.tsx`
constructed its own client locally and the router had no context at all, so a
router-context guard was impossible. Three files outside this feature's owned
paths were touched, minimally, to make the shared instance possible:

- `lib/api/query-client.ts` — added `export const queryClient = createQueryClient()`
  alongside the existing factory.
- `lib/api/index.ts` — re-exports it.
- `routes/__root.tsx` — switched `createRootRoute` to
  `createRootRouteWithContext<{ queryClient: QueryClient }>()` so `beforeLoad`
  anywhere in the tree can read `context.queryClient`, typed.
- `router.tsx` — passes `context: { queryClient }` to `createRouter`.
- `App.tsx` — renders `QueryClientProvider` with the same imported singleton
  instead of a locally constructed client.

No other behavior in those files changed. This mirrors the "composition root,
one line at the marked insertion point" allowance the backend modules get in
`apps/api/src/app.ts` — there was no way to satisfy "guard with the query client,
not an effect" without it.

## One-time API key reveal

`createApiKeyMutation`'s 201 response is the only time the raw key is ever sent to
the browser (`listApiKeys` only returns `prefix`). `ApiKeyRevealDialog` renders it
in a `Dialog` with `onInteractOutside`/`onEscapeKeyDown` both suppressed, so the
only way to dismiss it is the explicit "I've saved this key" button — it cannot be
lost to a stray click or `Esc`.

## Nullable generated fields

Several generated response fields (`displayName`, `email`, session `ip`/
`userAgent`, API key `lastUsedAt`/`expiresAt`) come back typed `string | unknown`
because the source Effect Schema is optional/opaque in a way the OpenAPI → Hey API
pipeline can't narrow (same root cause as the `Schema.Int` trap documented in
`docs/18-HANDOFF.md`). `nullable.ts#asText` narrows defensively at render time,
matching `features/monitors/nullable.ts#asText` — duplicated rather than imported,
since cross-feature imports are a lint-adjacent convention this repo avoids.

## Known gaps

- Email verification (`requestEmailVerification`/`verifyEmail`) is generated but
  out of scope for this pass — not listed in the task's endpoint set.
- Timezone is a free-text IANA identifier (validated by pattern server-side), not
  a searchable picker — there is no combobox primitive in `components/ui` yet.
