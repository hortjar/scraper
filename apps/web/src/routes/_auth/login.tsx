import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AuthShell } from "../../components/layouts/AuthShell"
import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import { Label } from "../../components/ui/Label"

const LoginRoute = () => {
  const { t } = useTranslation("auth")
  const { t: tCommon } = useTranslation("common")

  return (
    <AuthShell
      title={t("login.title")}
      description={t("login.subtitle")}
      footer={
        <span className="flex flex-wrap gap-1">
          {t("login.noAccount")}
          <Link to="/register" className="text-brand hover:underline">
            {t("login.registerLink")}
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
          <Label htmlFor="login-email">{t("fields.emailLabel")}</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder={t("fields.emailPlaceholder")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-password">{t("fields.passwordLabel")}</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder={t("fields.passwordPlaceholder")}
          />
        </div>

        <Button type="submit" variant="primary" size="lg">
          {t("login.submit")}
        </Button>

        <p className="text-small text-ink-subtle">{t("notice.notWired")}</p>
        <p className="sr-only">{tCommon("app.tagline")}</p>
      </form>
    </AuthShell>
  )
}

export const Route = createFileRoute("/_auth/login")({ component: LoginRoute })
