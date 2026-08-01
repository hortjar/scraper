export const ADMIN_PLUGIN = {
  routes: "admin/routes",
  handlers: "admin/handlers",
  queues: "admin/queues",
  queueGuard: "admin/queue-guard",
} as const

export const ADMIN_PATH = {
  stats: "/stats",
  queues: "/queues",
} as const

export const ADMIN_OPERATION_ID = {
  stats: "getAdminStats",
} as const

export const ADMIN_ACTION = {
  stats: "admin_stats",
  queues: "admin_queues",
} as const

export const ADMIN_SCOPE = "monitors:read"

export const QUEUE_BOARD_PREFIX = "/admin/queues"

export const QUEUE_BOARD_BASE = `/api/v1${QUEUE_BOARD_PREFIX}`

export const RECENT_WINDOW_HOURS = 24

export const RECENT_WINDOW = `${String(RECENT_WINDOW_HOURS)} hours`

export const COUNTED_STATES = ["waiting", "active", "delayed", "failed"] as const
