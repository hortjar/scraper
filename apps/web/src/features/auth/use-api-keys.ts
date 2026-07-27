import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { createApiKeyMutation, revokeApiKeyMutation } from "../../api"

import { apiKeysQueryKey, apiKeysQueryOptions } from "./api"

export const useApiKeys = () => useQuery(apiKeysQueryOptions())

export const useCreateApiKey = () => {
  const queryClient = useQueryClient()

  return useMutation({
    ...createApiKeyMutation(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiKeysQueryKey }),
  })
}

export const useRevokeApiKey = () => {
  const queryClient = useQueryClient()

  return useMutation({
    ...revokeApiKeyMutation(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiKeysQueryKey }),
  })
}
