import { queryOptions } from "@tanstack/react-query"

import { REFETCH_INTERVAL, STALE_TIME, type HealthResponse, apiRequest } from "../../lib/api"

const HEALTH_PATH = "/health"

export const healthQueryKey = ["system", "health"] as const

export const healthQueryOptions = () =>
  queryOptions({
    queryKey: healthQueryKey,
    queryFn: ({ signal }) => apiRequest<HealthResponse>(HEALTH_PATH, { signal }),
    staleTime: STALE_TIME.health,
    refetchInterval: REFETCH_INTERVAL.health,
    retry: false,
  })
