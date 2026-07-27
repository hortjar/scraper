import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Button } from "../../../components/ui/Button"
import { Input } from "../../../components/ui/Input"
import { Label } from "../../../components/ui/Label"
import type { FieldErrors, LoginField, LoginFormValues } from "../validation"

import { FieldError } from "./FieldError"
import { FormError } from "./FormError"

export interface LoginFormProperties {
  readonly values: LoginFormValues
  readonly errors: FieldErrors<LoginField>
  readonly pending: boolean
  readonly submitError: unknown
  readonly onFieldChange: <K extends LoginField>(field: K, value: LoginFormValues[K]) => void
  readonly onSubmit: () => void
}

export const LoginForm = ({
  values,
  errors,
  pending,
  submitError,
  onFieldChange,
  onSubmit,
}: LoginFormProperties) => {
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
        <Label htmlFor="login-email">{t("fields.emailLabel")}</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder={t("fields.emailPlaceholder")}
          value={values.email}
          aria-invalid={errors.email !== undefined}
          aria-describedby={errors.email === undefined ? undefined : "login-email-error"}
          onChange={(event) => {
            onFieldChange("email", event.target.value)
          }}
        />
        <FieldError id="login-email-error" messageKey={errors.email} />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="login-password">{t("fields.passwordLabel")}</Label>
          <Link to="/forgot-password" className="text-small text-brand hover:underline">
            {t("login.forgotPassword")}
          </Link>
        </div>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder={t("fields.passwordPlaceholder")}
          value={values.password}
          aria-invalid={errors.password !== undefined}
          aria-describedby={errors.password === undefined ? undefined : "login-password-error"}
          onChange={(event) => {
            onFieldChange("password", event.target.value)
          }}
        />
        <FieldError id="login-password-error" messageKey={errors.password} />
      </div>

      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        {t(pending ? "login.submitting" : "login.submit")}
      </Button>
    </form>
  )
}
