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
