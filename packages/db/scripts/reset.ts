import postgres from "postgres"

if (process.env.APP_ENV === "production") {
  throw new Error("refusing to reset a production database")
}

const url = process.env.DATABASE_URL ?? "postgres://scraper:scraper@localhost:9302/scraper"

const sql = postgres(url, { max: 1 })

await sql`DROP SCHEMA public CASCADE`
await sql`CREATE SCHEMA public`
await sql.end()

console.log("dropped and recreated the public schema; run migrate next")
