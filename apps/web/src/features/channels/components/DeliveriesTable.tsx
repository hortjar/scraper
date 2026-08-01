import { useTranslation } from "react-i18next"

import { RelativeTime } from "../../../components/molecules/RelativeTime"
import { DataTable, type DataTableColumn } from "../../../components/organisms"
import { Button } from "../../../components/ui"
import { DELIVERY_STATUS, EMPTY_VALUE_MARK } from "../constants"
import { suppressionReasonKey } from "../label-keys"
import type { DeliverySummary } from "../types"

import { DeliveryStatusBadge } from "./DeliveryStatusBadge"

export interface DeliveriesTableProperties {
  readonly deliveries: readonly DeliverySummary[]
  readonly onRetry: (delivery: DeliverySummary) => void
  readonly retryingId: string | null
  readonly className?: string
}

export const DeliveriesTable = ({
  deliveries,
  onRetry,
  retryingId,
  className,
}: DeliveriesTableProperties) => {
  const { t } = useTranslation("channels")

  const columns: readonly DataTableColumn<DeliverySummary>[] = [
    {
      id: "createdAt",
      header: t("deliveries.columns.createdAt"),
      cell: (delivery) => <RelativeTime value={delivery.createdAt} />,
    },
    {
      id: "status",
      header: t("deliveries.columns.status"),
      cell: (delivery) => <DeliveryStatusBadge status={delivery.status} />,
    },
    {
      id: "reason",
      header: t("deliveries.columns.reason"),
      cell: (delivery) =>
        delivery.suppressedReason === null ? (
          (delivery.lastError ?? EMPTY_VALUE_MARK)
        ) : (
          <span className="font-mono text-mono-data">
            {t(suppressionReasonKey(delivery.suppressedReason))}
          </span>
        ),
    },
    {
      id: "attempts",
      header: t("deliveries.columns.attempts"),
      numeric: true,
      align: "end",
      cell: (delivery) => delivery.attempts,
    },
    {
      id: "actions",
      header: t("deliveries.columns.actions"),
      align: "end",
      cell: (delivery) =>
        delivery.status === DELIVERY_STATUS.failed ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={retryingId === delivery.id}
            onClick={() => {
              onRetry(delivery)
            }}
          >
            {t("deliveries.actions.retry")}
          </Button>
        ) : (
          EMPTY_VALUE_MARK
        ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={deliveries}
      getRowId={(delivery) => delivery.id}
      caption={t("deliveries.caption")}
      className={className}
    />
  )
}
