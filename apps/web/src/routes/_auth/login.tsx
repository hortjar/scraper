import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AuthShell } from "../../components/layouts/AuthShell"
import { LoginContainer } from "../../features/auth"

const LoginRoute = () => {
  const { t } = useTranslation("auth")

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
      <LoginContainer />
    </AuthShell>
  )
}

export const Route = createFileRoute("/_auth/login")({ component: LoginRoute })
