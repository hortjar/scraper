import { useState } from "react"

import { ForgotPasswordForm } from "../components/ForgotPasswordForm"
import { useFormFields } from "../use-form-fields"
import { useRequestPasswordReset } from "../use-password-reset"
import {
  type ForgotPasswordFormValues,
  hasFieldErrors,
  validateForgotPasswordForm,
} from "../validation"

const INITIAL_VALUES: ForgotPasswordFormValues = { email: "" }

export const ForgotPasswordContainer = () => {
  const requestReset = useRequestPasswordReset()
  const { values, setField } = useFormFields(INITIAL_VALUES)
  const [submitted, setSubmitted] = useState(false)
  const [requested, setRequested] = useState(false)
  const errors = submitted ? validateForgotPasswordForm(values) : {}

  const handleSubmit = (): void => {
    setSubmitted(true)
    if (hasFieldErrors(validateForgotPasswordForm(values))) return

    requestReset.mutate(
      { body: values },
      {
        onSuccess: () => {
          setRequested(true)
        },
      },
    )
  }

  return (
    <ForgotPasswordForm
      values={values}
      errors={errors}
      pending={requestReset.isPending}
      submitError={requestReset.error}
      submitted={requested}
      onFieldChange={setField}
      onSubmit={handleSubmit}
    />
  )
}
