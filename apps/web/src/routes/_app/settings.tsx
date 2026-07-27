import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AppShell } from "../../components/layouts/AppShell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/Card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/Select"
import { Separator } from "../../components/ui/Separator"
import {
  ApiKeysSettingsContainer,
  LogoutButton,
  PasswordSettingsContainer,
  ProfileSettingsContainer,
  SessionsSettingsContainer,
} from "../../features/auth"
import { THEME_PREFERENCE, type ThemePreference } from "../../lib/browser"
import { setTheme, useTheme } from "../../stores/preferences"
import { DENSITY, type Density, setDensity, useDensity } from "../../stores/ui"

const THEME_LABEL_KEY = {
  system: "theme.system",
  light: "theme.light",
  dark: "theme.dark",
} as const satisfies Record<ThemePreference, string>

const DENSITY_LABEL_KEY = {
  comfortable: "density.comfortable",
  compact: "density.compact",
} as const satisfies Record<Density, string>

const AppearanceSection = () => {
  const { t } = useTranslation("common")
  const theme = useTheme()
  const density = useDensity()

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
      <div className="flex flex-col gap-1.5">
        <span className="text-small font-medium text-ink">{t("theme.label")}</span>
        <Select
          value={theme}
          onValueChange={(value) => {
            setTheme(value as ThemePreference)
          }}
        >
          <SelectTrigger aria-label={t("theme.label")} className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(THEME_PREFERENCE).map((value) => (
              <SelectItem key={value} value={value}>
                {t(THEME_LABEL_KEY[value])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-small font-medium text-ink">{t("density.label")}</span>
        <Select
          value={density}
          onValueChange={(value) => {
            setDensity(value as Density)
          }}
        >
          <SelectTrigger aria-label={t("density.label")} className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(DENSITY).map((value) => (
              <SelectItem key={value} value={value}>
                {t(DENSITY_LABEL_KEY[value])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

const SettingsRoute = () => {
  const { t } = useTranslation("settings")

  return (
    <AppShell title={t("title")} description={t("subtitle")}>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("appearance.title")}</CardTitle>
            <CardDescription>{t("appearance.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <AppearanceSection />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <CardTitle>{t("account.title")}</CardTitle>
              <CardDescription>{t("account.description")}</CardDescription>
            </div>
            <LogoutButton />
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <section className="flex flex-col gap-3">
              <h3 className="text-heading text-ink">{t("profile.title")}</h3>
              <ProfileSettingsContainer />
            </section>

            <Separator />

            <section className="flex flex-col gap-3">
              <h3 className="text-heading text-ink">{t("password.title")}</h3>
              <PasswordSettingsContainer />
            </section>

            <Separator />

            <section className="flex flex-col gap-3">
              <h3 className="text-heading text-ink">{t("sessions.title")}</h3>
              <p className="text-small text-ink-muted">{t("sessions.description")}</p>
              <SessionsSettingsContainer />
            </section>

            <Separator />

            <section className="flex flex-col gap-3">
              <h3 className="text-heading text-ink">{t("apiKeys.title")}</h3>
              <p className="text-small text-ink-muted">{t("apiKeys.description")}</p>
              <ApiKeysSettingsContainer />
            </section>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

export const Route = createFileRoute("/_app/settings")({ component: SettingsRoute })
