import { queryOptions } from "@tanstack/react-query"

import { getRunOptions, listChangesOptions, listRunsOptions } from "../../api"
import { STALE_TIME } from "../../lib/api"

export const monitorRunsQueryOptions = (monitorId: string) =>
  queryOptions({
    ...listRunsOptions({ path: { monitorId } }),
    staleTime: STALE_TIME.list,
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
