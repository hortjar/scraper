import { queryOptions } from "@tanstack/react-query"

import { getRunOptions, listChangesOptions, listRunsOptions, listRunsQueryKey } from "../../api"
import { REFETCH_INTERVAL, STALE_TIME } from "../../lib/api"

import { RUN_STATUS } from "./constants"
import type { RunListPage } from "./types"

export const monitorRunsQueryKey = (monitorId: string) => listRunsQueryKey({ path: { monitorId } })

const hasRunningRun = (page: RunListPage | undefined): boolean =>
  (page?.items ?? []).some((run) => run.status === RUN_STATUS.running)

export const monitorRunsQueryOptions = (monitorId: string) =>
  queryOptions({
    ...listRunsOptions({ path: { monitorId } }),
    staleTime: STALE_TIME.list,
    refetchInterval: ({ state }) =>
      hasRunningRun(state.data) ? REFETCH_INTERVAL.runsActive : REFETCH_INTERVAL.runs,
  })

export const monitorChangesQueryOptions = (monitorId: string) =>
  queryOptions({
    ...listChangesOptions({ path: { monitorId } }),
    staleTime: STALE_TIME.list,
  })

export const runDetailQueryOptions = (runId: string) =>
  queryOptions({
    ...getRunOptions({ path: { runId } }),
    staleTime: STALE_TIME.detail,
  })
