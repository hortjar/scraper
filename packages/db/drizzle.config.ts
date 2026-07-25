import { defineConfig } from "drizzle-kit"

const url = process.env.DATABASE_URL ?? "postgres://scraper:scraper@localhost:5432/scraper"

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
