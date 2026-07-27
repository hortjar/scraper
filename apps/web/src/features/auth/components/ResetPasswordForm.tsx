import { useTranslation } from "react-i18next"

import { Button } from "../../../components/ui/Button"
import { Input } from "../../../components/ui/Input"
import { Label } from "../../../components/ui/Label"
import type { FieldErrors, ResetPasswordField, ResetPasswordFormValues } from "../validation"

import { FieldError } from "./FieldError"
import { FormError } from "./FormError"

export interface ResetPasswordFormProperties {
  readonly values: ResetPasswordFormValues
  readonly errors: FieldErrors<ResetPasswordField>
  readonly pending: boolean
  readonly submitError: unknown
  readonly onFieldChange: <K extends ResetPasswordField>(
    field: K,
    value: ResetPasswordFormValues[K],
  ) => void
  readonly onSubmit: () => void
}

export const ResetPasswordForm = ({
  values,
  errors,
  pending,
  submitError,
  onFieldChange,
  onSubmit,
}: ResetPasswordFormProperties) => {
  const { t } = useTranslation("auth")

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
        <Label htmlFor="reset-password-password">{t("fields.passwordLabel")}</Label>
        <Input
          id="reset-password-password"
          type="password"
          autoComplete="new-password"
          placeholder={t("fields.passwordPlaceholder")}
          value={values.password}
          aria-invalid={errors.password !== undefined}
          aria-describedby={
            errors.password === undefined ? undefined : "reset-password-password-error"
          }
          onChange={(event) => {
            onFieldChange("password", event.target.value)
          }}
        />
        <FieldError id="reset-password-password-error" messageKey={errors.password} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reset-password-confirm">{t("fields.confirmPasswordLabel")}</Label>
        <Input
          id="reset-password-confirm"
          type="password"
          autoComplete="new-password"
          placeholder={t("fields.confirmPasswordPlaceholder")}
          value={values.confirmPassword}
          aria-invalid={errors.confirmPassword !== undefined}
          aria-describedby={
            errors.confirmPassword === undefined ? undefined : "reset-password-confirm-error"
          }
          onChange={(event) => {
            onFieldChange("confirmPassword", event.target.value)
          }}
        />
        <FieldError id="reset-password-confirm-error" messageKey={errors.confirmPassword} />
      </div>

      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        {t(pending ? "resetPassword.submitting" : "resetPassword.submit")}
      </Button>
    </form>
  )
}
