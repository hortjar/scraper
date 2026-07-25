import { Link } from "@tanstack/react-router"
import { PanelLeftIcon } from "lucide-react"
import type { ComponentType, ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "../../lib/utils"
import { Button } from "../ui/Button"

export interface SidebarNavItem {
  readonly to: string
  readonly label: string
  readonly icon: ComponentType<{ className?: string }>
}

export interface AppSidebarProperties {
  readonly items: readonly SidebarNavItem[]
  readonly collapsed: boolean
  readonly onToggle: () => void
  readonly footer?: ReactNode
  readonly className?: string
}

export const AppSidebar = ({
  items,
  collapsed,
  onToggle,
  footer,
  className,
}: AppSidebarProperties) => {
  const { t } = useTranslation("common")

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-line bg-surface transition-[width]",
        collapsed ? "w-sidebar-collapsed" : "w-sidebar",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-3 py-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("actions.toggleSidebar")}
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          <PanelLeftIcon className="size-4" aria-hidden="true" />
        </Button>
        {collapsed ? null : (
          <span className="display text-heading font-bold text-ink">{t("app.name")}</span>
        )}
      </div>

      <nav aria-label={t("nav.label")} className="flex flex-1 flex-col gap-0.5 px-2">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            activeOptions={{ exact: to === "/app" }}
            className={cn(
              "flex items-center gap-3 rounded-md px-2.5 py-2 text-small text-ink-muted",
              "transition-colors hover:bg-sunken hover:text-ink",
              "data-[status=active]:bg-brand-soft data-[status=active]:text-brand-ink",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {collapsed ? <span className="sr-only">{label}</span> : label}
          </Link>
        ))}
      </nav>

      {footer === undefined ? null : (
        <div className={cn("border-t border-line px-3 py-3", collapsed && "px-2")}>{footer}</div>
      )}
    </aside>
  )
}
