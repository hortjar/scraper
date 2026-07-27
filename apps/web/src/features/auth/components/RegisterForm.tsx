import { useTranslation } from "react-i18next"

import { Button } from "../../../components/ui/Button"
import { Input } from "../../../components/ui/Input"
import { Label } from "../../../components/ui/Label"
import type { FieldErrors, RegisterField, RegisterFormValues } from "../validation"

import { FieldError } from "./FieldError"
import { FormError } from "./FormError"

export interface RegisterFormProperties {
  readonly values: RegisterFormValues
  readonly errors: FieldErrors<RegisterField>
  readonly pending: boolean
  readonly submitError: unknown
  readonly onFieldChange: <K extends RegisterField>(field: K, value: RegisterFormValues[K]) => void
  readonly onSubmit: () => void
}

export const RegisterForm = ({
  values,
  errors,
  pending,
  submitError,
  onFieldChange,
  onSubmit,
}: RegisterFormProperties) => {
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
        <Label htmlFor="register-name">{t("fields.displayNameLabel")}</Label>
        <Input
          id="register-name"
          autoComplete="name"
          placeholder={t("fields.displayNamePlaceholder")}
          value={values.displayName}
          aria-invalid={errors.displayName !== undefined}
          aria-describedby={errors.displayName === undefined ? undefined : "register-name-error"}
          onChange={(event) => {
            onFieldChange("displayName", event.target.value)
          }}
        />
        <FieldError id="register-name-error" messageKey={errors.displayName} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-email">{t("fields.emailLabel")}</Label>
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          placeholder={t("fields.emailPlaceholder")}
          value={values.email}
          aria-invalid={errors.email !== undefined}
          aria-describedby={errors.email === undefined ? undefined : "register-email-error"}
          onChange={(event) => {
            onFieldChange("email", event.target.value)
          }}
        />
        <FieldError id="register-email-error" messageKey={errors.email} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-password">{t("fields.passwordLabel")}</Label>
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          placeholder={t("fields.passwordPlaceholder")}
          value={values.password}
          aria-invalid={errors.password !== undefined}
          aria-describedby="register-password-help register-password-error"
          onChange={(event) => {
            onFieldChange("password", event.target.value)
          }}
        />
        <p id="register-password-help" className="text-small text-ink-subtle">
          {t("fields.passwordHelp")}
        </p>
        <FieldError id="register-password-error" messageKey={errors.password} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-confirm-password">{t("fields.confirmPasswordLabel")}</Label>
        <Input
          id="register-confirm-password"
          type="password"
          autoComplete="new-password"
          placeholder={t("fields.confirmPasswordPlaceholder")}
          value={values.confirmPassword}
          aria-invalid={errors.confirmPassword !== undefined}
          aria-describedby={
            errors.confirmPassword === undefined ? undefined : "register-confirm-password-error"
          }
          onChange={(event) => {
            onFieldChange("confirmPassword", event.target.value)
          }}
        />
        <FieldError id="register-confirm-password-error" messageKey={errors.confirmPassword} />
      </div>

      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        {t(pending ? "register.submitting" : "register.submit")}
      </Button>
    </form>
  )
}
