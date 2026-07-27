import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AuthShell } from "../../components/layouts/AuthShell"
import { ForgotPasswordContainer } from "../../features/auth"

const ForgotPasswordRoute = () => {
  const { t } = useTranslation("auth")

  return (
    <AuthShell
      title={t("forgotPassword.title")}
      description={t("forgotPassword.subtitle")}
      footer={
        <span className="flex flex-wrap gap-1">
          <Link to="/login" className="text-brand hover:underline">
            {t("forgotPassword.backToLogin")}
          </Link>
        </span>
      }
    >
      <ForgotPasswordContainer />
    </AuthShell>
  )
}

export const Route = createFileRoute("/_auth/forgot-password")({ component: ForgotPasswordRoute })
