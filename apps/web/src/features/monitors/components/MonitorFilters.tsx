import { SearchIcon, XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "../../../components/ui/Button"
import { Input } from "../../../components/ui/Input"

export interface MonitorFiltersProperties {
  readonly search: string
  readonly tag: string
  readonly onSearchChange: (value: string) => void
  readonly onTagChange: (value: string) => void
  readonly onClear: () => void
}

export const MonitorFilters = ({
  search,
  tag,
  onSearchChange,
  onTagChange,
  onClear,
}: MonitorFiltersProperties) => {
  const { t } = useTranslation("monitors")
  const isFiltered = search.length > 0 || tag.length > 0

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-60 flex-1 flex-col gap-1.5">
        <label htmlFor="monitor-search" className="eyebrow text-ink-subtle">
          {t("list.searchLabel")}
        </label>
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-subtle"
            aria-hidden="true"
          />
          <Input
            id="monitor-search"
            type="search"
            value={search}
            className="pl-8"
            placeholder={t("list.searchPlaceholder")}
            onChange={(event) => {
              onSearchChange(event.target.value)
            }}
          />
        </div>
      </div>

      <div className="flex w-48 flex-col gap-1.5">
        <label htmlFor="monitor-tag" className="eyebrow text-ink-subtle">
          {t("list.tagLabel")}
        </label>
        <Input
          id="monitor-tag"
          value={tag}
          placeholder={t("list.tagPlaceholder")}
          onChange={(event) => {
            onTagChange(event.target.value)
          }}
        />
      </div>

      {isFiltered ? (
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          <XIcon className="size-3.5" aria-hidden="true" />
          {t("list.clearFilters")}
        </Button>
      ) : null}
    </div>
  )
}
