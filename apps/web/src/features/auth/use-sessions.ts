import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { revokeAllSessionsMutation, revokeSessionMutation } from "../../api"

import { sessionsQueryKey, sessionsQueryOptions } from "./api"

export const useSessions = () => useQuery(sessionsQueryOptions())

export const useRevokeSession = () => {
  const queryClient = useQueryClient()

  return useMutation({
    ...revokeSessionMutation(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionsQueryKey }),
  })
}

export const useRevokeAllSessions = () => {
  const queryClient = useQueryClient()

  return useMutation({
    ...revokeAllSessionsMutation(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionsQueryKey }),
  })
}
