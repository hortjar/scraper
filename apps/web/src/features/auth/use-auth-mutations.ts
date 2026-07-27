import { useMutation, useQueryClient } from "@tanstack/react-query"

import { loginMutation, logoutMutation, registerMutation } from "../../api"

import { sessionQueryKey } from "./api"

export const useLogin = () => {
  const queryClient = useQueryClient()

  return useMutation({
    ...loginMutation(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionQueryKey }),
  })
}

export const useRegister = () => {
  const queryClient = useQueryClient()

  return useMutation({
    ...registerMutation(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionQueryKey }),
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()

  return useMutation({
    ...logoutMutation(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionQueryKey }),
  })
}
