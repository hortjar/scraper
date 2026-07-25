import { SCHEDULE_KIND, SELECTOR_KIND, VALUE_TYPE } from "@scraper/core/constants"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { extractors, monitors, users } from "../src/schema/index.js"

const url = process.env.DATABASE_URL ?? "postgres://scraper:scraper@localhost:5432/scraper"
const email = process.env.SEED_EMAIL ?? "dev@example.com"

const UNUSABLE_PASSWORD = "!"

const sql = postgres(url, { max: 1 })
const db = drizzle(sql)

const [user] = await db
  .insert(users)
  .values({
    email,
    passwordHash: UNUSABLE_PASSWORD,
    displayName: "Dev User",
    timezone: "Europe/Prague",
    locale: "en",
    planLimits: { maxMonitors: 100, minIntervalSeconds: 300, maxChannels: 10 },
  })
  .onConflictDoNothing()
  .returning({ id: users.id })

const userId =
  user?.id ??
  (await db.select({ id: users.id }).from(users).limit(1).then((rows) => rows[0]?.id))

if (!userId) throw new Error("could not resolve a seed user")

const demos = [
  {
    name: "Example pricing page",
    url: "https://example.com/pricing",
    scheduleValue: "3600",
    contentSelector: "main",
    field: { key: "price", label: "Price", selector: ".price", valueType: VALUE_TYPE.price },
  },
  {
    name: "Example changelog",
    url: "https://example.com/changelog",
    scheduleValue: "21600",
    contentSelector: "article",
    field: {
      key: "latest",
      label: "Latest entry",
      selector: "article h2",
      valueType: VALUE_TYPE.text,
    },
  },
  {
    name: "Example stock status",
    url: "https://example.com/product",
    scheduleValue: "1800",
    contentSelector: null,
    field: {
      key: "available",
      label: "Availability",
      selector: ".stock",
      valueType: VALUE_TYPE.boolean,
    },
  },
]

for (const demo of demos) {
  const [monitor] = await db
    .insert(monitors)
    .values({
      userId,
      name: demo.name,
      url: demo.url,
      scheduleKind: SCHEDULE_KIND.interval,
      scheduleValue: demo.scheduleValue,
      scheduleTimezone: "Europe/Prague",
      contentSelector: demo.contentSelector,
      tags: ["demo"],
    })
    .returning({ id: monitors.id })

  if (!monitor) continue

  await db.insert(extractors).values({
    monitorId: monitor.id,
    key: demo.field.key,
    label: demo.field.label,
    selectorKind: SELECTOR_KIND.css,
    selector: demo.field.selector,
    valueType: demo.field.valueType,
    position: 0,
  })
}

await sql.end()

console.log(`seeded ${email} with ${demos.length} demo monitors`)
console.log("the seed password hash is unusable on purpose: register through the API instead")
