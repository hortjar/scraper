import { useState } from "react"

import { isLocaleCode } from "../../../i18n/resources"
import { ProfileForm } from "../components/ProfileForm"
import { asText } from "../nullable"
import type { CurrentUser } from "../types"
import { useUpdateProfile } from "../use-account-mutations"
import { useFormFields } from "../use-form-fields"
import { type ProfileFormValues, hasFieldErrors, validateProfileForm } from "../validation"

export interface ProfileSettingsFieldsProperties {
  readonly user: CurrentUser
}

const initialValuesFrom = (user: CurrentUser): ProfileFormValues => ({
  displayName: asText(user.displayName) ?? "",
  timezone: user.timezone,
  locale: user.locale,
})

export const ProfileSettingsFields = ({ user }: ProfileSettingsFieldsProperties) => {
  const updateProfile = useUpdateProfile()
  const { values, setField } = useFormFields(initialValuesFrom(user))
  const [submitted, setSubmitted] = useState(false)
  const [saved, setSaved] = useState(false)
  const errors = submitted ? validateProfileForm(values) : {}

  const handleSubmit = (): void => {
    setSubmitted(true)
    setSaved(false)
    if (hasFieldErrors(validateProfileForm(values))) return

    updateProfile.mutate(
      {
        body: {
          displayName: values.displayName,
          timezone: values.timezone,
          locale: isLocaleCode(values.locale) ? values.locale : user.locale,
        },
      },
      {
        onSuccess: () => {
          setSaved(true)
        },
      },
    )
  }

  return (
    <ProfileForm
      values={values}
      errors={errors}
      pending={updateProfile.isPending}
      submitError={updateProfile.error}
      saved={saved}
      onFieldChange={setField}
      onSubmit={handleSubmit}
    />
  )
}
