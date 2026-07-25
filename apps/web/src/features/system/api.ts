import { queryOptions } from "@tanstack/react-query"

import { getHealthOptions, getHealthQueryKey } from "../../api"
import { REFETCH_INTERVAL, STALE_TIME } from "../../lib/api"

export const healthQueryKey = getHealthQueryKey()

export const healthQueryOptions = () =>
  queryOptions({
    ...getHealthOptions(),
    staleTime: STALE_TIME.health,
    refetchInterval: REFETCH_INTERVAL.health,
    retry: false,
  })
