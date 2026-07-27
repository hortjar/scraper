import { Layer } from "effect"

import { ChannelRepositoryLive } from "./channel.repository.js"
import { NotificationsHttpClientLive } from "./channels/http-client.service.js"
import { ChannelSetLive } from "./channels/index.js"
import { ChannelRegistryLive } from "./channels/registry.service.js"
import { ChannelsLive } from "./channels.service.js"
import { CryptoLive } from "./crypto/crypto.service.js"
import { DeliveryRepositoryLive } from "./delivery.repository.js"
import { NotificationDispatcherLive } from "./dispatcher/notification-dispatcher.service.js"
import { MailerLive } from "./mailer/mailer.service.js"
import { RuleRepositoryLive } from "./rule.repository.js"
import { RulesLive } from "./rules.service.js"
import { TemplateRendererLive } from "./template/template-renderer.service.js"

export { ChannelRepository, ChannelRepositoryLive } from "./channel.repository.js"
export { RuleRepository, RuleRepositoryLive, type ActiveRule } from "./rule.repository.js"
export { DeliveryRepository, DeliveryRepositoryLive } from "./delivery.repository.js"

export {
  HttpRequestFailed,
  NotificationsHttpClient,
  NotificationsHttpClientLive,
  type HttpRequestInput,
  type HttpResponse,
} from "./channels/http-client.service.js"
export { ChannelSet, ChannelSetLive } from "./channels/index.js"
export { ChannelRegistry, ChannelRegistryLive } from "./channels/registry.service.js"

export { Crypto, CryptoLive } from "./crypto/crypto.service.js"
export {
  NotificationDispatcher,
  NotificationDispatcherLive,
} from "./dispatcher/notification-dispatcher.service.js"
export { withNotifyRetry } from "./dispatcher/retry.js"
export { MailDeliveryFailed, Mailer, MailerLive } from "./mailer/mailer.service.js"
export { TemplateRenderer, TemplateRendererLive } from "./template/template-renderer.service.js"

export { mergeSecret, splitSecret, type SplitConfig } from "./notifications.config-codec.js"
export * from "./notifications.types.js"

export { Channels, ChannelsLive } from "./channels.service.js"
export { channelRoutes, type ChannelServices } from "./channels.routes.js"
export { toChannelDto } from "./channels.dto.js"

export { Rules, RulesLive } from "./rules.service.js"
export { monitorRuleRoutes, ruleRoutes, type RuleServices } from "./rules.routes.js"
export { toRuleDto } from "./rules.dto.js"

export const NotificationsLayer = Layer.mergeAll(
  ChannelRegistryLive,
  NotificationsHttpClientLive,
  CryptoLive,
  MailerLive,
  TemplateRendererLive,
  NotificationDispatcherLive,
  ChannelRepositoryLive,
  DeliveryRepositoryLive,
  RuleRepositoryLive,
  ChannelsLive,
  RulesLive,
).pipe(Layer.provideMerge(ChannelSetLive))
