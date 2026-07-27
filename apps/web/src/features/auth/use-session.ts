import { useQuery } from "@tanstack/react-query"

import { sessionQueryOptions } from "./api"
import type { CurrentUser } from "./types"

export interface SessionState {
  readonly user: CurrentUser | undefined
  readonly isLoading: boolean
  readonly isAuthenticated: boolean
}

export const useSession = (): SessionState => {
  const query = useQuery(sessionQueryOptions())

  return {
    user: query.data,
    isLoading: query.isPending,
    isAuthenticated: query.isSuccess,
  }
}
