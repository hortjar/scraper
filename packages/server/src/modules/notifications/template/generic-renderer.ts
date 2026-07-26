import { NOTIFICATION_EVENT } from "@scraper/core/constants"
import type { ChangeSummary, NotificationMessage } from "@scraper/core/domain"
import type { SupportedLocale } from "@scraper/core/i18n"
import { MSG, Translator } from "@scraper/core/i18n"
import { Effect } from "effect"

import { APP_NAME } from "../notifications.constants.js"
import type {
  ChannelCapabilities,
  ChannelPayload,
  ChannelPayloadField,
} from "../notifications.types.js"

import {
  MAX_SUMMARY_FIELDS,
  TRUNCATION_LINK_SEPARATOR,
  TRUNCATION_SUFFIX,
} from "./template.constants.js"

const changeLine = (change: ChangeSummary): string =>
  `${change.label}: ${change.oldValue ?? "—"} → ${change.newValue ?? "—"}`

const changeLineMarkdown = (change: ChangeSummary): string =>
  `**${change.label}**: ${change.oldValue ?? "—"} → ${change.newValue ?? "—"}`

const changeFields = (changes: readonly ChangeSummary[]): readonly ChannelPayloadField[] =>
  changes.slice(0, MAX_SUMMARY_FIELDS).map((change) => ({
    label: change.label,
    value: `${change.oldValue ?? "—"} → ${change.newValue ?? "—"}`,
  }))

interface SubjectAndBody {
  readonly subject: string
  readonly body: string
}

const subjectAndBodyFor = (
  translator: Translator,
  message: NotificationMessage,
  locale: SupportedLocale,
): SubjectAndBody => {
  const monitorName = message.monitor.name
  switch (message.event) {
    case NOTIFICATION_EVENT.change: {
      return {
        subject: translator.render(MSG.notifications.changeSubject, { monitorName }, locale),
        body: translator.render(
          MSG.notifications.changeBody,
          { count: message.changes.length, monitorName },
          locale,
        ),
      }
    }
    case NOTIFICATION_EVENT.test: {
      return {
        subject: translator.render(MSG.notifications.testSubject, { appName: APP_NAME }, locale),
        body: translator.render(MSG.notifications.testBody, {}, locale),
      }
    }
    case NOTIFICATION_EVENT.runFailed: {
      return {
        subject: translator.render(MSG.notifications.runFailedSubject, { monitorName }, locale),
        body: translator.render(MSG.notifications.runFailedBody, { count: 1, reason: "" }, locale),
      }
    }
    case NOTIFICATION_EVENT.runRecovered: {
      return {
        subject: translator.render(MSG.notifications.runRecoveredSubject, { monitorName }, locale),
        body: translator.render(MSG.notifications.runRecoveredBody, { count: 1 }, locale),
      }
    }
    case NOTIFICATION_EVENT.monitorPaused: {
      return {
        subject: translator.render(MSG.notifications.monitorPausedSubject, { monitorName }, locale),
        body: translator.render(MSG.notifications.monitorPausedBody, { count: 0 }, locale),
      }
    }
    case NOTIFICATION_EVENT.digest: {
      return {
        subject: translator.render(
          MSG.notifications.digestSubject,
          { count: message.changes.length },
          locale,
        ),
        body: translator.render(MSG.notifications.digestBody, { since: monitorName }, locale),
      }
    }
  }
}

const truncate = (text: string, maxLength: number, link: string): string => {
  if (text.length <= maxLength) return text
  const budget = Math.max(
    0,
    maxLength - TRUNCATION_SUFFIX.length - TRUNCATION_LINK_SEPARATOR.length - link.length,
  )
  return `${text.slice(0, budget)}${TRUNCATION_SUFFIX}${TRUNCATION_LINK_SEPARATOR}${link}`
}

export const renderGeneric = (
  message: NotificationMessage,
  locale: SupportedLocale,
  capabilities: ChannelCapabilities,
): Effect.Effect<ChannelPayload, never, Translator> =>
  Effect.gen(function* () {
    const translator = yield* Translator
    const { subject, body } = subjectAndBodyFor(translator, message, locale)
    const lines =
      message.changes.length > 0 ? message.changes.map((change) => changeLine(change)) : [body]
    const linesMarkdown =
      message.changes.length > 0
        ? message.changes.map((change) => changeLineMarkdown(change))
        : [body]

    return {
      title: subject,
      summaryText: truncate(lines.join("\n"), capabilities.maxLength, message.links.run),
      summaryMarkdown: truncate(
        linesMarkdown.join("\n"),
        capabilities.maxLength,
        message.links.run,
      ),
      fields: changeFields(message.changes),
      url: message.links.run,
    }
  })
