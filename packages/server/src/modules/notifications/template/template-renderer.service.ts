import { blankToUndefined } from "@scraper/core/config"
import { LIMITS, SERVICE_TAG, SPAN } from "@scraper/core/constants"
import type { NotificationMessage } from "@scraper/core/domain"
import { TemplateInvalid } from "@scraper/core/errors"
import type { SupportedLocale } from "@scraper/core/i18n"
import { Translator } from "@scraper/core/i18n"
import { Effect } from "effect"

import type { ChannelCapabilities, ChannelPayload } from "../notifications.types.js"

import { renderGeneric } from "./generic-renderer.js"
import { toTemplateContext } from "./template-context.js"
import { hasBalancedEachBlocks, renderTemplate } from "./template-engine.js"

const renderCustom = (
  template: string,
  message: NotificationMessage,
  generic: ChannelPayload,
  capabilities: ChannelCapabilities,
): Effect.Effect<ChannelPayload, TemplateInvalid> =>
  Effect.gen(function* () {
    const bytes = Buffer.byteLength(template, "utf8")
    if (bytes > LIMITS.templateBytes) {
      return yield* Effect.fail(new TemplateInvalid({ detail: "template exceeds the size limit" }))
    }
    if (!hasBalancedEachBlocks(template)) {
      return yield* Effect.fail(
        new TemplateInvalid({ detail: "unbalanced {{#each}}/{{/each}} block" }),
      )
    }

    const rendered = yield* Effect.try({
      try: () =>
        renderTemplate(template, toTemplateContext(message) as unknown as Record<string, unknown>),
      catch: () => new TemplateInvalid({ detail: "template could not be rendered" }),
    })

    const text =
      rendered.length > capabilities.maxLength
        ? rendered.slice(0, capabilities.maxLength)
        : rendered

    return { ...generic, summaryText: text, summaryMarkdown: text, fields: [] }
  })

export class TemplateRenderer extends Effect.Service<TemplateRenderer>()(
  SERVICE_TAG.TemplateRenderer,
  {
    effect: Effect.gen(function* () {
      const translator = yield* Translator

      const render = Effect.fn(SPAN.notifications.render)(function* (
        message: NotificationMessage,
        locale: SupportedLocale,
        capabilities: ChannelCapabilities,
        customTemplate: string | null,
      ) {
        const generic = yield* renderGeneric(message, locale, capabilities).pipe(
          Effect.provideService(Translator, translator),
        )
        const template = blankToUndefined(customTemplate)
        if (template === undefined) return generic
        return yield* renderCustom(template, message, generic, capabilities)
      })

      return { render } as const
    }),
    dependencies: [Translator.Default],
  },
) {}

export const TemplateRendererLive = TemplateRenderer.Default
