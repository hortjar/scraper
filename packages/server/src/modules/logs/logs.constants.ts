export const LOG_STREAM_KEY = "logs:stream"
export const LOG_CURSOR_KEY = "logs:cursor"

export const LOG_STREAM_MAXLEN = 5000
export const LOG_DRAIN_BATCH = 500
export const LOG_TAIL_LIMIT = 200
export const LOG_TAIL_MAX = 1000

export const LOG_FIELD_RECORD = "record"

export const MAX_MESSAGE_CHARS = 2000
export const MAX_ANNOTATION_CHARS = 1000

export const LOG_PLUGIN = { handlers: "logs/handlers" } as const

export const LOG_PATH = { list: "/logs" } as const

export const LOG_OPERATION_ID = { list: "listLogs" } as const

export const LOG_ACTION = { list: "admin_logs" } as const

export const LOG_ENTITY = "app_log"
