import { Layer } from "effect"

import { LogRepository } from "./logs.repository.js"
import { Logs } from "./logs.service.js"

export { drainLogs } from "./drain-logs.js"
export { logShipperLayer } from "./log-shipper.js"
export { isPersisted, makeRecord, parseRecord, truncate, type LogRecord } from "./log-record.js"
export { LOG_ACTION, LOG_PATH, LOG_PLUGIN } from "./logs.constants.js"
export { LogRepository, LogRepositoryLive } from "./logs.repository.js"
export { logRoutes, type LogServices } from "./logs.routes.js"
export { LogListDto } from "./logs.schema.js"
export { Logs, LogsLive } from "./logs.service.js"

export const LogsLayer = Layer.mergeAll(Logs.Default, LogRepository.Default)
