import postgres from "postgres"

const url = process.env.DATABASE_URL ?? "postgres://scraper:scraper@localhost:5432/scraper"

if (process.env.APP_ENV === "production") {
  throw new Error("refusing to reset a production database")
}

const sql = postgres(url, { max: 1 })

await sql`DROP SCHEMA public CASCADE`
await sql`CREATE SCHEMA public`
await sql.end()

console.log("dropped and recreated the public schema; run migrate next")
