import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AuthShell } from "../../components/layouts/AuthShell"
import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import { Label } from "../../components/ui/Label"

const RegisterRoute = () => {
  const { t } = useTranslation("auth")

  return (
    <AuthShell
      title={t("register.title")}
      description={t("register.subtitle")}
      footer={
        <span className="flex flex-wrap gap-1">
          {t("register.haveAccount")}
          <Link to="/login" className="text-brand hover:underline">
            {t("register.loginLink")}
          </Link>
        </span>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-name">{t("fields.displayNameLabel")}</Label>
          <Input
            id="register-name"
            autoComplete="name"
            placeholder={t("fields.displayNamePlaceholder")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-email">{t("fields.emailLabel")}</Label>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder={t("fields.emailPlaceholder")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-password">{t("fields.passwordLabel")}</Label>
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            placeholder={t("fields.passwordPlaceholder")}
            aria-describedby="register-password-help"
          />
          <p id="register-password-help" className="text-small text-ink-subtle">
            {t("fields.passwordHelp")}
          </p>
        </div>

        <Button type="submit" variant="primary" size="lg">
          {t("register.submit")}
        </Button>

        <p className="text-small text-ink-subtle">{t("notice.notWired")}</p>
      </form>
    </AuthShell>
  )
}

export const Route = createFileRoute("/_auth/register")({ component: RegisterRoute })
