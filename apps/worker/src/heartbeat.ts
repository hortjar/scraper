import { REDIS_KEY } from "@scraper/core/constants"
import type Redis from "ioredis"

const HEARTBEAT_INTERVAL_MS = 15_000
const HEARTBEAT_TTL_SECONDS = 45

export type HeartbeatHandle = ReturnType<typeof setInterval>

export const startHeartbeat = (connection: Redis, workerId: string): HeartbeatHandle => {
  const write = (): void => {
    void connection.set(REDIS_KEY.workerHeartbeat(workerId), "1", "EX", HEARTBEAT_TTL_SECONDS)
  }
  write()
  return setInterval(write, HEARTBEAT_INTERVAL_MS)
}

export const stopHeartbeat = (handle: HeartbeatHandle): void => {
  clearInterval(handle)
}
