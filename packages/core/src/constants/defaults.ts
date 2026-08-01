export const PAGINATION = {
  defaultLimit: 25,
  maxLimit: 100,
} as const

export const FIRST_ATTEMPT = 1

export const RETRY = {
  scrapeAttempts: 3,
  notifyAttempts: 5,
  backoffBaseMs: 30_000,
  backoffMaxMs: 480_000,
  httpClientAttempts: 3,
} as const

export const TIMEOUT = {
  httpScrapeMs: 30_000,
  browserScrapeMs: 45_000,
  notifySendMs: 15_000,
  shutdownGraceMs: 15_000,
} as const

export const LIMITS = {
  monitorNameMax: 120,
  extractorKeyMax: 64,
  extractorsPerMonitor: 30,
  rulesPerMonitor: 20,
  transformsPerExtractor: 12,
  ignoreRulesPerMonitor: 50,
  tagsPerMonitor: 20,
  templateBytes: 8192,
  messagePreviewChars: 2000,
  diffHunkContextLines: 2,
  passwordMin: 12,
  passwordMax: 200,
} as const

export const SESSION = {
  refreshIntervalMs: 300_000,
  tokenBytes: 32,
  apiKeyBytes: 32,
  apiKeyPrefixLength: 8,
} as const

export const CACHE_TTL = {
  robotsSeconds: 86_400,
  metaSeconds: 60,
  statsSeconds: 300,
} as const

export const AUTO_ESCALATE = {
  minBytes: 4096,
  cooldownHours: 24,
  spaMarkers: ["__NEXT_DATA__", 'id="root"', 'id="app"', "ng-app", "data-reactroot"],
} as const

export const STALE_TIME_MS = {
  list: 30_000,
  detail: 15_000,
  activeRun: 5000,
  meta: 300_000,
} as const

export const DATABASE_LOCK = {
  migrations: 194_722_881,
} as const
