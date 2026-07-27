import { useTranslation } from "react-i18next"

import { Button } from "../../../components/ui/Button"
import { Input } from "../../../components/ui/Input"
import { Label } from "../../../components/ui/Label"
import type { FieldErrors, ForgotPasswordField, ForgotPasswordFormValues } from "../validation"

import { FieldError } from "./FieldError"
import { FormError } from "./FormError"

export interface ForgotPasswordFormProperties {
  readonly values: ForgotPasswordFormValues
  readonly errors: FieldErrors<ForgotPasswordField>
  readonly pending: boolean
  readonly submitError: unknown
  readonly submitted: boolean
  readonly onFieldChange: <K extends ForgotPasswordField>(
    field: K,
    value: ForgotPasswordFormValues[K],
  ) => void
  readonly onSubmit: () => void
}

export const ForgotPasswordForm = ({
  values,
  errors,
  pending,
  submitError,
  submitted,
  onFieldChange,
  onSubmit,
}: ForgotPasswordFormProperties) => {
  const { t } = useTranslation("auth")

  if (submitted) {
    return (
      <p role="status" className="text-body text-ink">
        {t("forgotPassword.confirmation")}
      </p>
    )
  }

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
        <Label htmlFor="forgot-password-email">{t("fields.emailLabel")}</Label>
        <Input
          id="forgot-password-email"
          type="email"
          autoComplete="email"
          placeholder={t("fields.emailPlaceholder")}
          value={values.email}
          aria-invalid={errors.email !== undefined}
          aria-describedby={errors.email === undefined ? undefined : "forgot-password-email-error"}
          onChange={(event) => {
            onFieldChange("email", event.target.value)
          }}
        />
        <FieldError id="forgot-password-email-error" messageKey={errors.email} />
      </div>

      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        {t(pending ? "forgotPassword.submitting" : "forgotPassword.submit")}
      </Button>
    </form>
  )
}
