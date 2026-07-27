import { queryOptions } from "@tanstack/react-query"

import {
  type ListMonitorsData,
  type Options,
  createMonitorMutation,
  deleteMonitorMutation,
  getMonitorOptions,
  getMonitorQueryKey,
  listMonitorsOptions,
  listMonitorsQueryKey,
  runMonitorNowMutation,
  updateMonitorMutation,
} from "../../api"
import { STALE_TIME } from "../../lib/api"

export interface MonitorListQuery {
  readonly search?: string
  readonly tag?: string
  readonly limit?: number
  readonly cursor?: string
}

const definedEntries = (query: MonitorListQuery): Readonly<Record<string, string | number>> =>
  Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== ""),
  )

const listRequest = (query: MonitorListQuery): Options<ListMonitorsData> =>
  ({ query: definedEntries(query) }) as Options<ListMonitorsData>

export const monitorListRootKey = () => listMonitorsQueryKey()

export const monitorListQueryOptions = (query: MonitorListQuery) =>
  queryOptions({
    ...listMonitorsOptions(listRequest(query)),
    staleTime: STALE_TIME.list,
  })

export const monitorQueryKey = (monitorId: string) => getMonitorQueryKey({ path: { monitorId } })

export const monitorQueryOptions = (monitorId: string) =>
  queryOptions({
    ...getMonitorOptions({ path: { monitorId } }),
    staleTime: STALE_TIME.detail,
  })

export const createMonitorMutationOptions = () => createMonitorMutation()

export const updateMonitorMutationOptions = () => updateMonitorMutation()

export const deleteMonitorMutationOptions = () => deleteMonitorMutation()

export const runMonitorNowMutationOptions = () => runMonitorNowMutation()
