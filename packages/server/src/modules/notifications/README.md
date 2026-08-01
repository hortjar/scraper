# notifications

Channels, the rules that route to them, template rendering and delivery. Spec:
[docs/06-NOTIFICATIONS.md](../../../../../docs/06-NOTIFICATIONS.md).

## Rule preview

`POST /rules/:id/preview` renders the rule's message against the monitor's most
recent changes, through the same `TemplateRenderer` and the same channel
capabilities the real send would use — so what the preview shows is what the
channel would receive, including truncation at the channel's `maxLength`.

`basedOnRunId` tells the caller which run it rendered from, and is `null` when the
monitor has no change yet. That case still returns 200 with the message frame and
an empty `changes` array rather than an error: the moment you are writing a
template is exactly the moment there is nothing to preview, and a 404 there would
make the endpoint useless when it is most needed. Nothing is fabricated — the
monitor name, URL and recipient locale are all real.

With no run to link to, `links.run` points at the monitor page. Pointing it at
`/runs/<ruleId>` to satisfy the branded `RunId` would render a link that 404s.

## Digest scheduling

A rule in `digest` mode holds its deliveries in a Redis set
(`REDIS_KEY.digestBucket`) instead of sending them, and a per-rule cron drains the
set. Until that cron existed the hold was permanent: the suppression was recorded
faithfully and the notification never arrived. `SCHEDULER_ID.digestRule` had been
defined for it since the beginning and nothing ever called it.

`buildDigestSchedulerPlan` produces one BullMQ job scheduler per rule, keyed by
rule id, so `Rules.create`/`update`/`remove` keep the scheduler in step with the
row — a rule switched away from digest, disabled, or deleted has its scheduler
removed rather than left firing against an empty bucket. `reconcile-schedules`
does the same sweep for digests that it already did for monitors: upsert every
enabled digest rule, remove every orphan. That is what brings rules created before
this existed under the cron.

**The window fields in `DigestJobPayload` are optional.** A BullMQ scheduler
template has static data, so a cron fire cannot know the window it is firing for,
and `flushDigest` drains whatever is in the bucket rather than selecting by time —
the bucket holds ids, not timestamps. Requiring `windowStart`/`windowEnd` would
have meant fabricating two values that nothing reads. They stay in the schema for
a manually enqueued flush.

The rule's cron timezone comes from its quiet hours when set, and UTC otherwise;
quiet hours are the only timezone a rule carries.

**A digest rule without a cron is rejected**, not defaulted. `digest` mode with no
`digestCron` has no owner to flush its bucket, so it holds every alert forever —
the exact failure the cron was added to fix. `update` validates the _merged_ result
rather than the patch, because either half can change on its own: switching a rule
to digest without adding a cron, and clearing the cron on a rule already in digest,
are the same defect arriving from opposite directions.
