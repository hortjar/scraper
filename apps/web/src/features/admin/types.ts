import type { GetAdminStatsResponse, ListLogsResponse } from "../../api"

import type { LOG_LEVEL } from "./constants"

export type AdminStats = GetAdminStatsResponse
export type LogListResponse = ListLogsResponse
export type LogRecord = LogListResponse["items"][number]
export type LogLevelName = (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL]
