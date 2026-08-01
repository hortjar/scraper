import { useTranslation } from "react-i18next"

import { Badge } from "../../../components/ui"
import type { ChannelSummary } from "../types"

export interface ChannelStatusBadgeProperties {
  readonly channel: ChannelSummary
}

export const ChannelStatusBadge = ({ channel }: ChannelStatusBadgeProperties) => {
  const { t } = useTranslation("channels")

  if (!channel.enabled) return <Badge tone="neutral">{t("status.disabled")}</Badge>
  if (channel.failureCount > 0) {
    return <Badge tone="negative">{t("status.failing", { count: channel.failureCount })}</Badge>
  }
  if (channel.verifiedAt === null) return <Badge tone="warning">{t("status.unverified")}</Badge>
  return <Badge tone="positive">{t("status.verified")}</Badge>
}
