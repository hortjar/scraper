import { QueryClient } from "@tanstack/react-query"

import { isClientError } from "./errors"

export const STALE_TIME = {
  default: 30_000,
  list: 30_000,
  detail: 60_000,
  health: 60_000,
} as const

export const REFETCH_INTERVAL = {
  health: 60_000,
  activity: 15_000,
} as const

const MAX_RETRIES = 2

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME.default,
        gcTime: 5 * 60_000,
        retry: (failureCount: number, error: Error) =>
          failureCount < MAX_RETRIES && !isClientError(error),
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchIntervalInBackground: false,
        networkMode: "online",
      },
      mutations: {
        retry: false,
        networkMode: "online",
      },
    },
  })
