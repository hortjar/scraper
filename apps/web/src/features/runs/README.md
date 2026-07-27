# runs (web feature)

Runs and changes for a single monitor: the runs panel, the run detail page, the
changes panel, and the diff renderer. Talks to `listRuns`, `listChanges` and
`getRun` — see `packages/server/src/modules/runs/README.md` for what a run and a
change contain, and `docs/04-FRONTEND.md` / `docs/15-DESIGN-SYSTEM.md` for the
conventions this follows.

## Exports (`index.ts`)

- `MonitorRunsPanel` / `MonitorRunsPanelProperties` — self-contained panel, takes a
  `monitorId`. Fetches, renders loading/error/empty/data states, table of runs with
  status, trigger, strategy, HTTP status, duration, payload size, changed, and the
  error kind/message when a run failed. Clicking a row navigates to `/runs/$runId`.
- `MonitorChangesPanel` / `MonitorChangesPanelProperties` — same shape, for changes.
  Each change renders as a card: kind, timestamp, old→new value, delta badges for
  numeric changes, and the diff when the backend attached one.
- `RunDetailContainer` / `RunDetailContainerProperties` — the run plus its extracted
  field values, used by the `/runs/$runId` route.
- `DiffRenderer` / `DiffRendererProperties` — pure presentational renderer for a
  `DiffHunk[]`. Exported because it is the one piece of this feature worth reusing
  outside it.
- Domain types: `RunSummary`, `RunDetail`, `RunFieldValue`, `ChangeSummary`,
  `DiffHunk`.

## Why a `transforms.ts` / `nullable.ts` layer exists

The generated OpenAPI client (`apps/web/src/api/generated/types.gen.ts`) turns every
nullable field into `X | unknown` instead of `X | null`. A JSON Schema `anyOf: [X,
{type: "null"}]` becomes a TypeScript union with `unknown` in it, and `X | unknown`
collapses to plain `unknown` — so `run.durationMs`, `run.errorKind`,
`change.deltaPercent`, every field value's `valueNumber`/`valueBool`/`valueList`,
`change.diff`, all type as `unknown` in the generated response types. This is not
specific to `runs`; the same thing happens to `GetMonitorResponse`'s nullable
fields, and `features/monitors/nullable.ts` works around it the same way.

Regenerating the client would need `pnpm gen:openapi && pnpm gen:api`, which this
feature is explicitly not allowed to run, and the fix is on the OpenAPI/JSON-Schema
side (`packages/core` domain schemas + the `mapJsonSchema` config), not something a
single feature should paper over by hand-editing generated output.

So: `nullable.ts` holds runtime type guards (`asString`, `asNumber`, `asBoolean`,
`asStringList`) that narrow `unknown` back to the real type or `null`.
`transforms.ts` uses them once, at the boundary, to turn a raw
`ListRunsResponse`/`ListChangesResponse`/`GetRunResponse` item into a clean
`RunSummary` / `ChangeSummary` / `RunDetail`. Every component downstream sees a
properly typed domain object and never touches `unknown` or the generated types
directly. `transforms.test.ts` covers both the happy path and the case where the
server sends something the static type promised but the runtime shape does not
match (a defensive test, not a hypothetical one — the generated type gives zero
guarantee here).

## `constants.ts` / `exhaustive.ts`

`apps/web` does not depend on the `@scraper/core` package (it is a Bun/Effect
backend package; the web app only talks to the API over HTTP), so `RUN_STATUS`,
`RUN_TRIGGER`, `CHANGE_KIND` and a local `DIFF_HUNK_KIND` are mirrored here as
`const` objects, each built through `covering<T>()` against the literal union type
extracted from the generated response types
(`RunListItem["status"]`, `ChangeListItem["changeKind"]`, …). `covering` fails to
compile if the object's values do not exactly cover the union, so a backend enum
change that isn't mirrored here is a type error, not a silent gap. This mirrors
`features/monitors/exhaustive.ts` and `features/monitors/constants.ts` exactly; it
is duplicated per-feature on purpose, the same way each backend module owns its own
`<name>.constants.ts` rather than sharing one.

## Known gap: cursor pagination is not reachable from the frontend

`listRuns` and `listChanges` are meant to take `cursor`/`limit` query parameters —
`packages/server/src/modules/runs/runs.schema.ts` defines `PageQueryParameters` and
`runs.service.ts` reads `query.cursor`/`query.limit` at runtime. But
`runs.routes.ts` never passes a `query:` schema to either Elysia route handler, so:

- the parameters never make it into `openapi.json` (Elysia only documents params
  it was given a schema for), and
- the generated client types `ListRunsData`/`ListChangesData` as `query?: never`,
  so `listRunsOptions`/`listChangesOptions` cannot be called with a cursor without
  either hand-writing request code (forbidden — `docs/04-FRONTEND.md` §5) or an
  `any`/type-assertion escape hatch (forbidden — no `any`, no working around lint).

Both panels therefore fetch and render a single page (the backend's default page
size) and do not attempt a "load more" control, because a control that cannot
actually advance the cursor would be worse than no control. `nextCursor` is present
on the response and unused. This is a backend wiring gap, not a frontend choice —
fixing it is a one-line addition of `query: Schema.standardSchemaV1(PageQueryParameters)`
to the two `GET` handlers in `runs.routes.ts`, followed by `pnpm gen:openapi && pnpm
gen:api`. Once that lands, `api.ts` here needs a real pagination story (probably
`useInfiniteQuery`, keyed by `nextCursor`) and both panels get a "load more" affordance.

## The diff renderer

`DiffRenderer` renders a `DiffHunk[]` (`{ kind: "added" | "removed" | "unchanged",
value: string }`) as a stack of lines, mono (`--font-mono`, this is machine-produced
text per `docs/15-DESIGN-SYSTEM.md` §1). Added/removed are never color-only: added
is tinted `--positive-soft`/`--positive-ink`, removed is tinted
`--negative-soft`/`--negative-ink` _and_ struck through, and every line carries a
screen-reader-only label (`sr-only`) alongside a `+`/`−` glyph, so the distinction
survives color blindness, a black-and-white screenshot, and a screen reader.
`changedOnly` (wired to a `Switch` in `ChangesList`) filters `unchanged` lines out
client-side; there is no server support needed since a change's `diff` is already
fully present on the `ChangeDto` from `listChanges` — no separate `/runs/:id/diff`
endpoint exists or is needed for this.

Deliberately out of scope, versus the fuller "diff viewer" sketched in
`docs/15-DESIGN-SYSTEM.md` §8: inline/split layout toggle and `j`/`k` hunk
navigation. The data model here is hunk-based (line-level context, truncated
server-side per `modules/runs/README.md`'s `DIFF_CONTEXT_LINES`/`MAX_DIFF_HUNKS`),
not the word-level diff that section describes, and the task this feature was built
against asked specifically for "added/removed visually distinct, unchanged muted" —
that is what is built and tested. `stores/ui.ts`'s `DIFF_VIEW`/`useDiffView` exists
for whoever builds that fuller viewer later; this feature does not use it, to avoid
claiming a toggle it does not implement.

## Numeric deltas

`change.deltaPercent` comes from the backend already multiplied by 100 (see
`percentChange` in `modules/runs/diff/field-diff.ts`: `((current - previous) /
Math.abs(previous)) * 100`). `components/molecules/DeltaBadge`'s `percent` kind
calls `Intl.NumberFormat` with `style: "percent"`, which expects a _ratio_ (`0.5` →
`"50%"`). `format.ts`'s `percentToRatio` divides by 100 at the point of use in
`ChangeCard`, so passing the raw backend value straight into `DeltaBadge` would have
rendered `5000%` for a 50% change — `format.test.ts` pins this conversion down.
