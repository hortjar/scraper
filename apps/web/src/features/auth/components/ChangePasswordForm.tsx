import { useTranslation } from "react-i18next"

import { Button } from "../../../components/ui/Button"
import { Input } from "../../../components/ui/Input"
import { Label } from "../../../components/ui/Label"
import type { ChangePasswordField, ChangePasswordFormValues, FieldErrors } from "../validation"

import { FieldError } from "./FieldError"
import { FormError } from "./FormError"

export interface ChangePasswordFormProperties {
  readonly values: ChangePasswordFormValues
  readonly errors: FieldErrors<ChangePasswordField>
  readonly pending: boolean
  readonly submitError: unknown
  readonly saved: boolean
  readonly onFieldChange: <K extends ChangePasswordField>(
    field: K,
    value: ChangePasswordFormValues[K],
  ) => void
  readonly onSubmit: () => void
}

export const ChangePasswordForm = ({
  values,
  errors,
  pending,
  submitError,
  saved,
  onFieldChange,
  onSubmit,
}: ChangePasswordFormProperties) => {
  const { t } = useTranslation("settings")
  const { t: tAuth } = useTranslation("auth")

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
        <Label htmlFor="password-current">{t("password.currentLabel")}</Label>
        <Input
          id="password-current"
          type="password"
          autoComplete="current-password"
          value={values.currentPassword}
          aria-invalid={errors.currentPassword !== undefined}
          aria-describedby={
            errors.currentPassword === undefined ? undefined : "password-current-error"
          }
          onChange={(event) => {
            onFieldChange("currentPassword", event.target.value)
          }}
        />
        <FieldError id="password-current-error" messageKey={errors.currentPassword} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password-new">{t("password.newLabel")}</Label>
        <Input
          id="password-new"
          type="password"
          autoComplete="new-password"
          placeholder={tAuth("fields.passwordPlaceholder")}
          value={values.newPassword}
          aria-invalid={errors.newPassword !== undefined}
          aria-describedby={errors.newPassword === undefined ? undefined : "password-new-error"}
          onChange={(event) => {
            onFieldChange("newPassword", event.target.value)
          }}
        />
        <FieldError id="password-new-error" messageKey={errors.newPassword} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password-confirm">{tAuth("fields.confirmPasswordLabel")}</Label>
        <Input
          id="password-confirm"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          aria-invalid={errors.confirmPassword !== undefined}
          aria-describedby={
            errors.confirmPassword === undefined ? undefined : "password-confirm-error"
          }
          onChange={(event) => {
            onFieldChange("confirmPassword", event.target.value)
          }}
        />
        <FieldError id="password-confirm-error" messageKey={errors.confirmPassword} />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          {t(pending ? "password.saving" : "password.save")}
        </Button>
        {saved ? <span className="text-small text-positive">{t("password.saved")}</span> : null}
      </div>
    </form>
  )
}
