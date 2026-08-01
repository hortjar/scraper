import type {
  ListChannelKindsResponse,
  ListChannelsResponse,
  ListDeliveriesResponse,
  ListRulesResponse,
} from "../../api"

export type ChannelListResponse = ListChannelsResponse
export type ChannelResponse = ChannelListResponse["items"][number]

export type ChannelKindListResponse = ListChannelKindsResponse
export type ChannelKindResponse = ChannelKindListResponse["items"][number]
export type ChannelFieldResponse = ChannelKindResponse["fields"][number]
export type ChannelFieldType = ChannelFieldResponse["type"]

export type DeliveryListResponse = ListDeliveriesResponse
export type DeliveryResponse = DeliveryListResponse["items"][number]
export type DeliveryStatus = DeliveryResponse["status"]

export type RuleListResponse = ListRulesResponse
export type RuleResponse = RuleListResponse["items"][number]

export interface ChannelSummary {
  readonly id: string
  readonly kind: string
  readonly name: string
  readonly enabled: boolean
  readonly hasSecret: boolean
  readonly failureCount: number
  readonly verifiedAt: string | null
  readonly createdAt: string
  readonly updatedAt: string
  readonly config: Readonly<Record<string, unknown>>
}

export interface DeliverySummary {
  readonly id: string
  readonly ruleId: string
  readonly channelId: string
  readonly monitorId: string
  readonly status: DeliveryStatus
  readonly attempts: number
  readonly lastError: string | null
  readonly suppressedReason: string | null
  readonly sentAt: string | null
  readonly createdAt: string
}

export type ChannelFormValues = Readonly<Record<string, string>>
