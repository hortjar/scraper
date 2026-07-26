import { SERVICE_TAG } from "@scraper/core/constants"
import type { ChannelDescriptor } from "@scraper/core/domain"
import type { SupportedLocale } from "@scraper/core/i18n"
import { Translator } from "@scraper/core/i18n"
import { Context, Effect, Option } from "effect"

import type { ErasedNotificationChannel } from "../notifications.types.js"

export class ChannelSet extends Context.Tag(SERVICE_TAG.ChannelSet)<
  ChannelSet,
  readonly ErasedNotificationChannel[]
>() {}

const toDescriptor =
  (translator: Translator, locale: SupportedLocale) =>
  (channel: ErasedNotificationChannel): ChannelDescriptor => ({
    kind: channel.kind,
    displayName: translator.render(channel.displayNameKey, {}, locale),
    descriptionKey: channel.descriptionKey,
    icon: channel.icon,
    fields: channel.fields,
    capabilities: channel.capabilities,
  })

export class ChannelRegistry extends Effect.Service<ChannelRegistry>()(
  SERVICE_TAG.ChannelRegistry,
  {
    effect: Effect.gen(function* () {
      const channels = yield* ChannelSet
      const translator = yield* Translator
      const byKind = new Map(channels.map((channel) => [channel.kind, channel] as const))

      return {
        get: (kind: string) => Option.fromNullable(byKind.get(kind)),
        list: () => channels,
        describe: (locale: SupportedLocale) =>
          channels.map((channel) => toDescriptor(translator, locale)(channel)),
      } as const
    }),
    dependencies: [Translator.Default],
  },
) {}

export const ChannelRegistryLive = ChannelRegistry.Default
