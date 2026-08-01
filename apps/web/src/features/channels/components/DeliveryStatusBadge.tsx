import { useTranslation } from "react-i18next"

import { Badge, type BadgeProperties } from "../../../components/ui"
import { DELIVERY_STATUS } from "../constants"
import { DELIVERY_STATUS_LABEL } from "../label-keys"
import type { DeliveryStatus } from "../types"

const STATUS_TONE: Readonly<Record<DeliveryStatus, NonNullable<BadgeProperties["tone"]>>> = {
  [DELIVERY_STATUS.pending]: "info",
  [DELIVERY_STATUS.sent]: "positive",
  [DELIVERY_STATUS.failed]: "negative",
  [DELIVERY_STATUS.suppressed]: "neutral",
}

export interface DeliveryStatusBadgeProperties {
  readonly status: DeliveryStatus
}

export const DeliveryStatusBadge = ({ status }: DeliveryStatusBadgeProperties) => {
  const { t } = useTranslation("channels")

  return <Badge tone={STATUS_TONE[status]}>{t(DELIVERY_STATUS_LABEL[status])}</Badge>
}
