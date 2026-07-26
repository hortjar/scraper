import { hostname } from "node:os"
import process from "node:process"

import { REDIS_KEY } from "@scraper/core/constants"
import Redis from "ioredis"

const DEFAULT_HOST = "redis"
const DEFAULT_PORT = "6379"
const DEFAULT_DATABASE_INDEX = "0"
const TIMEOUT_MS = 4000

const url = process.env.REDIS_URL
const host = process.env.REDIS_HOST ?? DEFAULT_HOST
const port = Number(process.env.REDIS_PORT ?? DEFAULT_PORT)
const databaseIndex = Number(process.env.REDIS_DB ?? DEFAULT_DATABASE_INDEX)
const password = process.env.REDIS_PASSWORD

const client =
  url === undefined
    ? new Redis({
        host,
        port,
        db: databaseIndex,
        password,
        lazyConnect: true,
        connectTimeout: TIMEOUT_MS,
      })
    : new Redis(url, { lazyConnect: true, connectTimeout: TIMEOUT_MS })

try {
  await client.connect()
  const alive = await client.get(REDIS_KEY.workerHeartbeat(hostname()))
  process.exit(alive === null ? 1 : 0)
} catch {
  process.exit(1)
} finally {
  client.disconnect()
}
