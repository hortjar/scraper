import { useTranslation } from "react-i18next"

import { EmptyState } from "../../../components/organisms/EmptyState"

export interface MonitorActivityPlaceholderProperties {
  readonly monitorId: string
}

export const MonitorActivityPlaceholder = ({ monitorId }: MonitorActivityPlaceholderProperties) => {
  const { t } = useTranslation("monitors")

  return (
    <section data-monitor-activity-slot={monitorId} className="flex flex-col gap-3">
      <h2 className="text-heading text-ink">{t("detail.panelsTitle")}</h2>
      <EmptyState title={t("detail.panelsTitle")} description={t("detail.panelsDescription")} />
    </section>
  )
}
