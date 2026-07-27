import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import { LoginForm } from "../components/LoginForm"
import { useLogin } from "../use-auth-mutations"
import { useFormFields } from "../use-form-fields"
import { type LoginFormValues, hasFieldErrors, validateLoginForm } from "../validation"

const INITIAL_VALUES: LoginFormValues = { email: "", password: "" }
const DASHBOARD_PATH = "/dashboard"

export const LoginContainer = () => {
  const navigate = useNavigate()
  const login = useLogin()
  const { values, setField } = useFormFields(INITIAL_VALUES)
  const [submitted, setSubmitted] = useState(false)
  const errors = submitted ? validateLoginForm(values) : {}

  const handleSubmit = (): void => {
    setSubmitted(true)
    if (hasFieldErrors(validateLoginForm(values))) return

    login.mutate(
      { body: values },
      {
        onSuccess: () => {
          void navigate({ to: DASHBOARD_PATH })
        },
      },
    )
  }

  return (
    <LoginForm
      values={values}
      errors={errors}
      pending={login.isPending}
      submitError={login.error}
      onFieldChange={setField}
      onSubmit={handleSubmit}
    />
  )
}
