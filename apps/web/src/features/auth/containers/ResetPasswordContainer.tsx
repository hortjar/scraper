import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import { ResetPasswordForm } from "../components/ResetPasswordForm"
import { useFormFields } from "../use-form-fields"
import { useResetPassword } from "../use-password-reset"
import {
  type ResetPasswordFormValues,
  hasFieldErrors,
  validateResetPasswordForm,
} from "../validation"

export interface ResetPasswordContainerProperties {
  readonly token: string
}

const INITIAL_VALUES: ResetPasswordFormValues = { password: "", confirmPassword: "" }
const LOGIN_PATH = "/login"

export const ResetPasswordContainer = ({ token }: ResetPasswordContainerProperties) => {
  const navigate = useNavigate()
  const resetPassword = useResetPassword()
  const { values, setField } = useFormFields(INITIAL_VALUES)
  const [submitted, setSubmitted] = useState(false)
  const errors = submitted ? validateResetPasswordForm(values) : {}

  const handleSubmit = (): void => {
    setSubmitted(true)
    if (hasFieldErrors(validateResetPasswordForm(values))) return

    resetPassword.mutate(
      { body: { token, password: values.password } },
      {
        onSuccess: () => {
          void navigate({ to: LOGIN_PATH })
        },
      },
    )
  }

  return (
    <ResetPasswordForm
      values={values}
      errors={errors}
      pending={resetPassword.isPending}
      submitError={resetPassword.error}
      onFieldChange={setField}
      onSubmit={handleSubmit}
    />
  )
}
