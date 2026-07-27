import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import { RegisterForm } from "../components/RegisterForm"
import { useRegister } from "../use-auth-mutations"
import { useFormFields } from "../use-form-fields"
import { type RegisterFormValues, hasFieldErrors, validateRegisterForm } from "../validation"

const INITIAL_VALUES: RegisterFormValues = {
  email: "",
  password: "",
  confirmPassword: "",
  displayName: "",
}
const DASHBOARD_PATH = "/dashboard"

export const RegisterContainer = () => {
  const navigate = useNavigate()
  const register = useRegister()
  const { values, setField } = useFormFields(INITIAL_VALUES)
  const [submitted, setSubmitted] = useState(false)
  const errors = submitted ? validateRegisterForm(values) : {}

  const handleSubmit = (): void => {
    setSubmitted(true)
    if (hasFieldErrors(validateRegisterForm(values))) return

    const trimmedName = values.displayName.trim()

    register.mutate(
      {
        body:
          trimmedName.length > 0
            ? { email: values.email, password: values.password, displayName: trimmedName }
            : { email: values.email, password: values.password },
      },
      {
        onSuccess: () => {
          void navigate({ to: DASHBOARD_PATH })
        },
      },
    )
  }

  return (
    <RegisterForm
      values={values}
      errors={errors}
      pending={register.isPending}
      submitError={register.error}
      onFieldChange={setField}
      onSubmit={handleSubmit}
    />
  )
}
