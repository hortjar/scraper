import process from "node:process"

import { ROUTE } from "@scraper/core/constants"

const DEFAULT_PORT = "9300"
const TIMEOUT_MS = 4000

const port = process.env.API_PORT ?? DEFAULT_PORT
const url = `http://127.0.0.1:${port}${ROUTE.apiBase}${ROUTE.ready}`

try {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  process.exit(response.ok ? 0 : 1)
} catch {
  process.exit(1)
}
