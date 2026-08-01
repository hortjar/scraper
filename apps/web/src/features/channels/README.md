# channels

The notifications surface: channels, the rules that route to them, and the
deliveries that came out the other end. Backend contract is
[docs/09-API.md](../../../../../docs/09-API.md) §"Channels & rules".

## Forms are built from the server's descriptors

`GET /channels/kinds` returns each kind's fields — name, type, `required`,
`secret`, options. `ChannelForm` renders that list; it knows nothing about email
versus Telegram. Adding a channel kind on the server therefore adds its form here
with no frontend change, which is the whole reason the endpoint returns
descriptors instead of the UI hard-coding five shapes.

The one thing that does not come from the server is the field **label**, because
the descriptor carries a core i18n key (`channels.fields.botToken`) and the web
catalog is namespaced separately. `label-keys.ts` maps between them and falls back
to a generic label rather than rendering a raw key at the user. That map is the
place to touch when a new field name appears.

## Secrets

A stored secret is never sent to the browser — `hasSecret` is all the API reports.
So a blank secret input means "keep what is stored", not "clear it", and
`toConfigPayload` drops empty secret fields from the payload entirely rather than
sending `""`. `missingRequiredFields` knows the same rule: a required secret that
is already stored is not missing.

There is deliberately no masked placeholder. A `••••` that round-tripped through a
PATCH would overwrite the real secret with bullets.

## Kind is locked after creation

The server keys the config schema off `kind`, so changing it would leave a config
that validates against nothing. The select is disabled on edit and says why.
