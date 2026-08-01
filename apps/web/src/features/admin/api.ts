import { queryOptions } from "@tanstack/react-query"

import { getAdminStatsOptions, listLogsOptions, type ListLogsData, type Options } from "../../api"
import { STALE_TIME } from "../../lib/api"

export interface LogQuery {
  readonly level?: string
  readonly service?: string
  readonly persisted?: string
}

const definedEntries = (query: LogQuery): Readonly<Record<string, string>> =>
  Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== ""),
  )

const logRequest = (query: LogQuery): Options<ListLogsData> =>
  ({ query: definedEntries(query) }) as Options<ListLogsData>

export const adminStatsQueryOptions = () =>
  queryOptions({ ...getAdminStatsOptions(), staleTime: STALE_TIME.list })

export const adminLogsQueryOptions = (query: LogQuery) =>
  queryOptions({ ...listLogsOptions(logRequest(query)), staleTime: STALE_TIME.list })
