import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Button } from "../../../components/ui/Button"
import { useLogout } from "../use-auth-mutations"

const LOGIN_PATH = "/login"

export const LogoutButton = () => {
  const { t } = useTranslation("common")
  const navigate = useNavigate()
  const logout = useLogout()

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={logout.isPending}
      onClick={() => {
        logout.mutate(
          {},
          {
            onSuccess: () => {
              void navigate({ to: LOGIN_PATH })
            },
          },
        )
      }}
    >
      {t("actions.signOut")}
    </Button>
  )
}
