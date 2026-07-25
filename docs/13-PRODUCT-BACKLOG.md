# Product Backlog

Derived from research into what people actually use change-monitoring and scraping
tools for (changedetection.io's feature set and community requests, competitor-price
monitoring SaaS, and the pain points those tools' users report). Ordered by value
per unit of effort.

## The five jobs people hire a scraper for

1. **Price monitoring** — "tell me when this drops below X / by more than Y%."
   Personal deal-hunting and competitive pricing intelligence. The dominant use case.
2. **Availability / restock** — "tell me the moment this is in stock, tickets go on
   sale, or an appointment slot opens." Latency matters more here than anywhere else.
3. **Content change watching** — competitor pricing pages, changelogs, ToS and
   policy updates, job boards, government/regulatory pages, documentation.
4. **Structured data collection** — repeatedly extract a table or listing set and
   keep a history: real-estate listings, rankings, review counts.
5. **Uptime/defacement adjacent** — "tell me if this page breaks, disappears, or
   changes unexpectedly."

The v1 data model serves all five: extractors + typed values + threshold rules
cover 1, 2, and 4; whole-page diffing covers 3 and 5.

## In v1 (see [00-IMPLEMENTATION-PLAN](./00-IMPLEMENTATION-PLAN.md))

- URL + CSS/XPath/JSONPath/regex/JSON-LD extraction, multiple named fields per monitor
- HTTP and browser strategies with auto-escalation
- Interval and cron schedules, per-user timezone
- Ignore rules and content scoping (the false-positive killers)
- Text/word diffing, numeric deltas with absolute and percent
- 11 rule triggers incl. thresholds, keywords, availability, failure/recovery
- Throttling, quiet hours, digests
- Email, webhook, Slack, Discord, Telegram channels behind a plugin registry
- Run history, value charts, diff viewer, manual runs
- Auth, API keys, public REST API, OpenAPI

## v1.1 — the fast follows

| Item                                                                                                        | Why                                                                                                                     | Effort |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------ |
| **Visual selector** — click an element in a rendered screenshot, get the selector                           | The single biggest usability unlock; non-technical users cannot write XPath. changedetection.io's most-praised feature. | L      |
| **Screenshot / visual diff** — pixel-compare with a change-percentage threshold                             | Catches layout and image changes text diffing can't see                                                                 | M      |
| **Monitor templates** — presets for Amazon-style product pages, GitHub releases, RSS, generic pricing pages | Cuts time-to-first-alert from 10 minutes to 30 seconds                                                                  | S      |
| **Browser login steps** — record/replay a login sequence, store cookies encrypted                           | Huge amount of watchable content lives behind a login                                                                   | L      |
| **Import/export** — JSON config, and importing from changedetection.io                                      | Lowers switching cost, gives users backup confidence                                                                    | S      |
| **RSS/Atom output per monitor**                                                                             | Users want changes in their own reader/automation                                                                       | S      |

## v1.2 — depth

| Item                                                                                                                       | Why                                                          |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **LLM-assisted selectors** — describe the field in plain language, get a selector proposal validated against the live page | Turns the hardest step into a sentence                       |
| **LLM change summaries** — "the Pro plan went from $49 to $59 and dropped the SSO bullet"                                  | Converts a raw diff into the answer the user actually wanted |
| **Semantic-change filtering** — ignore changes that don't matter (reworded marketing copy)                                 | Attacks notification fatigue from the other end              |
| **Multi-page / crawl monitors** — follow pagination or a listing → detail links                                            | Needed for real listing collection                           |
| **Conditional / chained monitors** — "when A changes, run B"                                                               | Composability people ask for constantly                      |
| **Data export** — CSV/JSON/Parquet, scheduled to S3 or a webhook                                                           | Feeds the "collection" use case into warehouses              |
| **Apprise adapter** — one channel implementation, 80+ services                                                             | Enormous channel coverage for one sidecar                    |
| **Web push + mobile PWA**                                                                                                  | Restock alerts want a phone buzz, not an email               |

## v2 — platform

- **Team workspaces**: shared monitors, roles, per-team channels, invitations
- **Public/shared monitor pages**: read-only link to a monitor's history
- **Proxy pool support**: operator-configured proxies for geo-checks and distribution
- **Multi-region workers**: "what does this page look like from Germany?" — a real
  requirement for pricing intelligence
- **Alert rules across monitors**: "any of my 40 competitor pages changed pricing today"
- **SLA/uptime reporting** per monitored page
- **Plugin SDK**: third-party channels and extractors as npm packages resolved at boot
- **Usage quotas & billing hooks** if this ever runs multi-tenant commercially

## Explicitly out of scope

| Not doing                                                                        | Why                                                                         |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| CAPTCHA solving, fingerprint spoofing, anti-bot evasion                          | Legal exposure, an unwinnable arms race, and it changes what this tool _is_ |
| Scraping behind other people's authentication without the user's own credentials | Same                                                                        |
| A no-code general web-automation/RPA builder                                     | Different product; scope discipline                                         |
| Bundled residential proxies                                                      | Operator's choice and operator's liability                                  |

## Design principles the backlog is filtered through

1. **False positives are worse than missed changes.** A tool that cries wolf gets
   muted, and a muted tool is uninstalled. Ignore rules, `required` extractors,
   thresholds, and digests all serve this.
2. **Every alert answers "what changed?" in one click.** The deep link to the diff
   is the product.
3. **Silence must be explainable.** Suppressed deliveries are recorded and shown.
4. **The 80% case is a static page and one number.** Optimize that path relentlessly;
   let the browser strategy be the exception, not the default.
5. **Extensibility beats feature count.** A signed webhook and a channel registry
   let users build what we haven't.
