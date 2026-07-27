import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AuthShell } from "../../components/layouts/AuthShell"
import { RegisterContainer } from "../../features/auth"

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
      <RegisterContainer />
    </AuthShell>
  )
}

export const Route = createFileRoute("/_auth/register")({ component: RegisterRoute })
