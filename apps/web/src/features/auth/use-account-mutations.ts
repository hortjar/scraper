import { useMutation, useQueryClient } from "@tanstack/react-query"

import { changePasswordMutation, updateCurrentUserMutation } from "../../api"

import { sessionQueryKey } from "./api"

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()

  return useMutation({
    ...updateCurrentUserMutation(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionQueryKey }),
  })
}

export const useChangePassword = () => useMutation({ ...changePasswordMutation() })
