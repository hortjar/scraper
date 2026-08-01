# admin

The two operator endpoints from [docs/09-API.md](../../../../../docs/09-API.md)
§System. Both require `role: admin` per
[docs/08-AUTH.md](../../../../../docs/08-AUTH.md) §7.

## `GET /admin/stats`

Counts that answer "is this install healthy", in one request: users and admins,
monitors total/enabled/degraded, runs in the last `windowHours` split by
failed/changed, deliveries grouped by status, and the depth of all four queues.

`windowHours` is in the response rather than assumed by the caller, so a dashboard
never has to hard-code the window this endpoint happens to use.

### Each queue reports how many workers are attached

A depth on its own cannot distinguish "busy" from "abandoned": ten waiting jobs
look identical whether the worker is chewing through them or has been dead for a
day. `getWorkersCount()` asks Redis how many clients hold that queue's blocking
connection, so `workers: 0` is a positive statement that nothing will ever pick
these jobs up — the condition behind every "my run is stuck in queued" report.
It is per queue rather than per process because a worker can fail to register one
queue while serving the rest, and a global heartbeat would call that healthy.

**The counts come back from postgres as strings.** `count(*) filter (…)` is a
bigint, and the driver hands it over as text even though drizzle types it `number`
— the same trap that broke change decoding. Every aggregate goes through
`withNumericColumns` rather than being trusted for what its type claims.

## `GET /admin/queues`

Bull Board, mounted only when `ENABLE_BULL_BOARD=true`. When the flag is off the
routes do not exist at all (404) rather than existing and refusing — there is no
dashboard to attack and no adapter constructed.

**The board's routes are registered by its own adapter, so the `auth` macro cannot
reach them.** A queue dashboard is not a read-only curiosity: it lists job payloads
and offers retry and remove. It is therefore wrapped in an `onBeforeHandle` guard
that authenticates the session and runs the _same_ `assertAllowed` the macro uses,
with `role: admin`. Reusing that function rather than re-checking the role here
keeps one definition of what "admin" permits.

Verified against a running stack: anonymous 401, non-admin 403, admin 200, flag off 404.
