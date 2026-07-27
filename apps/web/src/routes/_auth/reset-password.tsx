import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AuthShell } from "../../components/layouts/AuthShell"
import { ResetPasswordContainer } from "../../features/auth"

export interface ResetPasswordSearch {
  readonly token: string
}

const ResetPasswordRoute = () => {
  const { t } = useTranslation("auth")
  const { token } = Route.useSearch()

  return (
    <AuthShell
      title={t("resetPassword.title")}
      description={t("resetPassword.subtitle")}
      footer={
        <span className="flex flex-wrap gap-1">
          <Link to="/login" className="text-brand hover:underline">
            {t("forgotPassword.backToLogin")}
          </Link>
        </span>
      }
    >
      {token === "" ? (
        <p className="text-body text-ink-muted">{t("resetPassword.missingToken")}</p>
      ) : (
        <ResetPasswordContainer token={token} />
      )}
    </AuthShell>
  )
}

export const Route = createFileRoute("/_auth/reset-password")({
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: ResetPasswordRoute,
})
