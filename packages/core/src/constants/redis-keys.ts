export const KEY_PREFIX = {
  rateLimit: "rl",
  dedupe: "dedupe",
  digest: "digest",
  robots: "robots",
  heartbeat: "hb",
  lock: "lock",
  session: "session",
} as const

export const REDIS_KEY = {
  domainRateLimit: (host: string) => `${KEY_PREFIX.rateLimit}:domain:${host}`,
  userRateLimit: (userId: string, bucket: string) =>
    `${KEY_PREFIX.rateLimit}:user:${userId}:${bucket}`,
  ipRateLimit: (ip: string, bucket: string) => `${KEY_PREFIX.rateLimit}:ip:${ip}:${bucket}`,
  authRateLimit: (bucket: string, identity: string) =>
    `${KEY_PREFIX.rateLimit}:auth:${bucket}:${identity}`,
  userConcurrency: (userId: string) => `${KEY_PREFIX.rateLimit}:concurrency:${userId}`,
  notifyDedupe: (ruleId: string, messageHash: string) =>
    `${KEY_PREFIX.dedupe}:notify:${ruleId}:${messageHash}`,
  digestBucket: (ruleId: string) => `${KEY_PREFIX.digest}:${ruleId}`,
  quietHoursQueue: (ruleId: string) => `${KEY_PREFIX.digest}:quiet:${ruleId}`,
  robotsTxt: (host: string) => `${KEY_PREFIX.robots}:${host}`,
  workerHeartbeat: (workerId: string) => `${KEY_PREFIX.heartbeat}:worker:${workerId}`,
  schedulerLastFire: (queue: string) => `${KEY_PREFIX.heartbeat}:queue:${queue}`,
  migrationLock: () => `${KEY_PREFIX.lock}:migrations`,
} as const
