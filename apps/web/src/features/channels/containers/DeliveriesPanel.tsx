import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { EmptyState, ErrorState, LoadingState } from "../../../components/organisms"
import { cn } from "../../../lib/utils"
import {
  deliveryListQueryOptions,
  deliveryListRootKey,
  retryDeliveryMutationOptions,
  type DeliveryListQuery,
} from "../api"
import { DeliveriesTable } from "../components/DeliveriesTable"
import { toDeliverySummary } from "../transforms"
import type { DeliverySummary } from "../types"

export interface DeliveriesPanelProperties {
  readonly query: DeliveryListQuery
  readonly className?: string
}

export const DeliveriesPanel = ({ query, className }: DeliveriesPanelProperties) => {
  const { t } = useTranslation("channels")
  const queryClient = useQueryClient()
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const deliveries = useQuery(deliveryListQueryOptions(query))

  const retryDelivery = useMutation({
    ...retryDeliveryMutationOptions(),
    onSettled: () => {
      setRetryingId(null)
      void queryClient.invalidateQueries({ queryKey: deliveryListRootKey() })
    },
  })

  if (deliveries.isPending) return <LoadingState className={className} />
  if (deliveries.isError) {
    return (
      <ErrorState
        error={deliveries.error}
        title={t("deliveries.errorTitle")}
        onRetry={() => {
          void deliveries.refetch()
        }}
        className={className}
      />
    )
  }

  const items = deliveries.data.items.map((item) => toDeliverySummary(item))

  if (items.length === 0) {
    return (
      <EmptyState
        title={t("deliveries.emptyTitle")}
        description={t("deliveries.emptyDescription")}
        className={className}
      />
    )
  }

  const handleRetry = (delivery: DeliverySummary) => {
    setRetryingId(delivery.id)
    retryDelivery.mutate({ path: { deliveryId: delivery.id } })
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <DeliveriesTable deliveries={items} onRetry={handleRetry} retryingId={retryingId} />
    </div>
  )
}
