import { useTranslation } from "react-i18next"

import { Button } from "../../../components/ui/Button"
import { Input } from "../../../components/ui/Input"
import { Label } from "../../../components/ui/Label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/Select"
import { type LocaleCode, SUPPORTED_LOCALES } from "../../../i18n/resources"
import type { FieldErrors, ProfileField, ProfileFormValues } from "../validation"

import { FieldError } from "./FieldError"
import { FormError } from "./FormError"

const LOCALE_LABEL_KEY = { en: "locale.en", cs: "locale.cs" } as const satisfies Record<
  LocaleCode,
  string
>

export interface ProfileFormProperties {
  readonly values: ProfileFormValues
  readonly errors: FieldErrors<ProfileField>
  readonly pending: boolean
  readonly submitError: unknown
  readonly saved: boolean
  readonly onFieldChange: <K extends ProfileField>(field: K, value: ProfileFormValues[K]) => void
  readonly onSubmit: () => void
}

export const ProfileForm = ({
  values,
  errors,
  pending,
  submitError,
  saved,
  onFieldChange,
  onSubmit,
}: ProfileFormProperties) => {
  const { t } = useTranslation("settings")
  const { t: tAuth } = useTranslation("auth")
  const { t: tCommon } = useTranslation("common")

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <FormError error={submitError} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-display-name">{tAuth("fields.displayNameLabel")}</Label>
        <Input
          id="profile-display-name"
          autoComplete="name"
          value={values.displayName}
          aria-invalid={errors.displayName !== undefined}
          aria-describedby={
            errors.displayName === undefined ? undefined : "profile-display-name-error"
          }
          onChange={(event) => {
            onFieldChange("displayName", event.target.value)
          }}
        />
        <FieldError id="profile-display-name-error" messageKey={errors.displayName} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-timezone">{t("profile.timezoneLabel")}</Label>
        <Input
          id="profile-timezone"
          placeholder={t("profile.timezonePlaceholder")}
          value={values.timezone}
          aria-invalid={errors.timezone !== undefined}
          aria-describedby={errors.timezone === undefined ? undefined : "profile-timezone-error"}
          onChange={(event) => {
            onFieldChange("timezone", event.target.value)
          }}
        />
        <FieldError id="profile-timezone-error" messageKey={errors.timezone} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-locale">{t("profile.localeLabel")}</Label>
        <Select
          value={values.locale}
          onValueChange={(value) => {
            onFieldChange("locale", value as LocaleCode)
          }}
        >
          <SelectTrigger id="profile-locale" aria-invalid={errors.locale !== undefined}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LOCALES.map((code) => (
              <SelectItem key={code} value={code}>
                {tCommon(LOCALE_LABEL_KEY[code])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-small text-ink-subtle">{t("language.description")}</p>
        <FieldError id="profile-locale-error" messageKey={errors.locale} />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          {t(pending ? "profile.saving" : "profile.save")}
        </Button>
        {saved ? <span className="text-small text-positive">{t("profile.saved")}</span> : null}
      </div>
    </form>
  )
}
