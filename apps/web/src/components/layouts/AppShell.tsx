import { BellIcon, GaugeIcon, HistoryIcon, RadarIcon, SearchIcon, SettingsIcon } from "lucide-react"
import { type ReactNode, useState } from "react"
import { useTranslation } from "react-i18next"

import { AppStatus } from "../../features/system"
import { useHotkey } from "../../lib/browser"
import { useIsSidebarCollapsed, toggleSidebar } from "../../stores/ui"
import { AppSidebar, type SidebarNavItem } from "../organisms/AppSidebar"
import { CommandPalette } from "../organisms/CommandPalette"
import { Button } from "../ui/Button"

const PALETTE_HOTKEY = "mod+k"
const PALETTE_HINT = "⌘K"

export interface AppShellProperties {
  readonly title: string
  readonly description?: string
  readonly actions?: ReactNode
  readonly children: ReactNode
}

export const AppShell = ({ title, description, actions, children }: AppShellProperties) => {
  const { t } = useTranslation("common")
  const isCollapsed = useIsSidebarCollapsed()
  const [paletteOpen, setPaletteOpen] = useState(false)

  useHotkey(PALETTE_HOTKEY, () => {
    setPaletteOpen(true)
  })

  const items: readonly SidebarNavItem[] = [
    { to: "/dashboard", label: t("nav.dashboard"), icon: GaugeIcon },
    { to: "/monitors", label: t("nav.monitors"), icon: RadarIcon },
    { to: "/runs", label: t("nav.runs"), icon: HistoryIcon },
    { to: "/channels", label: t("nav.channels"), icon: BellIcon },
    { to: "/settings", label: t("nav.settings"), icon: SettingsIcon },
  ]

  return (
    <div className="flex min-h-dvh bg-canvas">
      <AppSidebar
        items={items}
        collapsed={isCollapsed}
        onToggle={toggleSidebar}
        footer={isCollapsed ? null : <AppStatus />}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <h1 className="text-title text-ink">{title}</h1>
            {description === undefined ? null : (
              <p className="mt-1 text-small text-ink-muted">{description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              aria-label={t("actions.openCommandPalette")}
              onClick={() => {
                setPaletteOpen(true)
              }}
            >
              <SearchIcon className="size-3.5" aria-hidden="true" />
              <span className="text-mono-micro text-ink-subtle">{PALETTE_HINT}</span>
            </Button>
            {actions}
          </div>
        </header>

        <main className="mx-auto w-full max-w-app flex-1 px-6 py-6">{children}</main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        items={items.map((item) => ({ id: item.to, label: item.label, hint: item.to }))}
        onSelect={() => {
          setPaletteOpen(false)
        }}
      />
    </div>
  )
}
