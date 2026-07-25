import { useState } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "../../lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/Dialog"
import { Input } from "../ui/Input"

export interface CommandPaletteItem {
  readonly id: string
  readonly label: string
  readonly hint?: string
}

export interface CommandPaletteProperties {
  readonly open: boolean
  readonly onOpenChange: (isOpen: boolean) => void
  readonly items: readonly CommandPaletteItem[]
  readonly onSelect: (item: CommandPaletteItem) => void
}

const isMatch = (item: CommandPaletteItem, query: string): boolean =>
  item.label.toLocaleLowerCase().includes(query.toLocaleLowerCase())

export const CommandPalette = ({
  open,
  onOpenChange,
  items,
  onSelect,
}: CommandPaletteProperties) => {
  const { t } = useTranslation("common")
  const [query, setQuery] = useState("")

  const visible = query.length === 0 ? items : items.filter((item) => isMatch(item, query))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-24 translate-y-0 p-0">
        <DialogTitle className="sr-only">{t("palette.title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("palette.placeholder")}</DialogDescription>

        <Input
          autoFocus
          value={query}
          placeholder={t("palette.placeholder")}
          aria-label={t("palette.placeholder")}
          className="rounded-none rounded-t-lg border-0 border-b border-line focus-visible:outline-0"
          onChange={(event) => {
            setQuery(event.target.value)
          }}
        />

        <ul className="max-h-80 overflow-y-auto p-1">
          {visible.length === 0 ? (
            <li className="px-3 py-6 text-center text-small text-ink-muted">
              {t("palette.empty")}
            </li>
          ) : (
            visible.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-sm px-3 py-2",
                    "text-left text-small text-ink hover:bg-sunken",
                  )}
                  onClick={() => {
                    onSelect(item)
                    onOpenChange(false)
                  }}
                >
                  {item.label}
                  {item.hint === undefined ? null : (
                    <span className="text-mono-micro text-ink-subtle">{item.hint}</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
