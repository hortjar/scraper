import { useState } from "react"

import { ChangePasswordForm } from "../components/ChangePasswordForm"
import { useChangePassword } from "../use-account-mutations"
import { useFormFields } from "../use-form-fields"
import {
  type ChangePasswordFormValues,
  hasFieldErrors,
  validateChangePasswordForm,
} from "../validation"

const INITIAL_VALUES: ChangePasswordFormValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
}

export const PasswordSettingsContainer = () => {
  const changePassword = useChangePassword()
  const { values, setField, reset } = useFormFields(INITIAL_VALUES)
  const [submitted, setSubmitted] = useState(false)
  const [saved, setSaved] = useState(false)
  const errors = submitted ? validateChangePasswordForm(values) : {}

  const handleSubmit = (): void => {
    setSubmitted(true)
    setSaved(false)
    if (hasFieldErrors(validateChangePasswordForm(values))) return

    changePassword.mutate(
      { body: { currentPassword: values.currentPassword, newPassword: values.newPassword } },
      {
        onSuccess: () => {
          setSaved(true)
          setSubmitted(false)
          reset(INITIAL_VALUES)
        },
      },
    )
  }

  return (
    <ChangePasswordForm
      values={values}
      errors={errors}
      pending={changePassword.isPending}
      submitError={changePassword.error}
      saved={saved}
      onFieldChange={setField}
      onSubmit={handleSubmit}
    />
  )
}
