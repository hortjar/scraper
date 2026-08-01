# scraping

Fetch a page and turn it into values. Pure input to output — this module never
touches the database. Spec:
[docs/05-SCRAPING.md](../../../../../docs/05-SCRAPING.md).

## Extraction is scoped to the whole document, not the body

With no `contentSelector`, extractors run against `document.documentElement`. It
used to be `body`, which meant **every `<head>` selector silently matched nothing**
— `title`, `meta[property="og:price:amount"]`, `link[rel=canonical]`. Those are
among the most common things anyone scrapes, and the failure was indistinguishable
from a wrong selector: no value, no error, no warning, just `missing`.

It was especially easy to believe the selector was correct, because
`POST /monitors/preview` reports the page title from its own parse rather than
through an extractor — so the editor showed a title while an extractor asking for
that same title came back empty.

A `contentSelector` still narrows to that element, and narrowing to `body` then
asking for `title` correctly finds nothing: that is the user saying "only look
here". The tests pin both directions.

## The browser strategy needs Node

`chromium.connectOverCDP` hangs under Bun because playwright's bundled WebSocket
client waits for `node:http`'s `'upgrade'` event and Bun emits `'response'` for the 101. `apps/worker` runs on Node for this reason; see `modules/runs/README.md`
§Traps for the evidence.

Because auto-escalation moves a run to the browser whenever the required
extractors do not match, a broken browser also broke `engine: auto` — an ordinary
selector mistake surfaced as a 45-second browser timeout instead of a missing
extractor.

## Every failure carries a detail

`ScrapeFailed` for a timeout, a size cap or a redirect dead-end used to carry no
`detail`, so the run's stored `errorMessage` read `unknown`. They all say what
happened now, with the URL and the limit that was hit.
