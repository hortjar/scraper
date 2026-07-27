import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AuthShell } from "../../components/layouts/AuthShell"
import { LoginContainer } from "../../features/auth"

export interface LoginSearch {
  readonly registered?: true
}

const validateLoginSearch = (raw: Record<string, unknown>): LoginSearch =>
  raw.registered === true || raw.registered === "true" ? { registered: true } : {}

const LoginRoute = () => {
  const { t } = useTranslation("auth")
  const { registered } = Route.useSearch()

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
      {registered === true && (
        <p role="status" className="mb-4 text-small text-positive">
          {t("login.registeredNotice")}
        </p>
      )}
      <LoginContainer />
    </AuthShell>
  )
}

export const Route = createFileRoute("/_auth/login")({
  component: LoginRoute,
  validateSearch: validateLoginSearch,
})
