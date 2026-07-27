import { useMutation } from "@tanstack/react-query"

import { requestPasswordResetMutation, resetPasswordMutation } from "../../api"

export const useRequestPasswordReset = () => useMutation({ ...requestPasswordResetMutation() })

export const useResetPassword = () => useMutation({ ...resetPasswordMutation() })
