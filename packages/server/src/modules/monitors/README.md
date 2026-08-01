# monitors

Monitor CRUD, extractors, preview and portability. Spec:
[docs/09-API.md](../../../../../docs/09-API.md) §Monitors.

## Export and import

`GET /monitors/:id/export` returns the portable half of a monitor — everything that
describes _what to watch and how_, and nothing that describes _this instance_: no
id, no user, no run history, no `lastRunAt`, no `enabled`. `POST /monitors/import`
takes an array of those documents.

Export → import → export comes back identical, which is the property worth testing.
A field-by-field assertion would rot every time the config grows a key; the
round-trip does not.

Three deliberate choices:

- **Imported monitors arrive disabled.** A file of fifty monitors would otherwise
  start fifty schedules against fifty sites the moment the request returns.
  `duplicate` already set this precedent for the same reason.
- **Every document carries a `version`.** Import rejects what it does not
  recognise, and the validation issue points at the offending array index rather
  than failing the batch anonymously. Without it, a future format change surfaces
  as a confusing decode error inside a user's file.
- **Import is not a side door.** It is bounded by `MAX_IMPORT_MONITORS`, and each
  document still passes the plan limit, the schedule floor and the URL guard that
  `create` enforces.

`monitors.portability.ts` holds the pure part — building the document and deciding
whether a batch is acceptable — so the service keeps only the I/O.

## Why the routes are split

`monitors.routes.ts`, `extractors.routes.ts` and `portability.routes.ts` are three
Elysia plugins on one prefix rather than one file, because the module's route table
is past the point where a single file stays readable. Each plugin needs its own
`name` for Elysia's dedupe; they are listed in `MONITOR_PLUGIN`.
