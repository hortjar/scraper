import type { NotificationMessage } from "@scraper/core/domain"

export interface TemplateChange {
  readonly label: string
  readonly kind: string
  readonly old: string
  readonly new: string
  readonly deltaAbsolute: number | string
  readonly deltaPercent: number | string
}

export interface TemplateContext {
  readonly event: string
  readonly monitor: { readonly name: string; readonly url: string }
  readonly rule: { readonly name: string }
  readonly change: TemplateChange
  readonly changes: readonly TemplateChange[]
  readonly run: { readonly id: string; readonly durationMs: number }
  readonly links: { readonly monitor: string; readonly run: string; readonly unsubscribe: string }
}

const EMPTY_CHANGE: TemplateChange = {
  label: "",
  kind: "",
  old: "",
  new: "",
  deltaAbsolute: "",
  deltaPercent: "",
}

const toTemplateChange = (change: NotificationMessage["changes"][number]): TemplateChange => ({
  label: change.label,
  kind: change.changeKind,
  old: change.oldValue ?? "",
  new: change.newValue ?? "",
  deltaAbsolute: change.deltaAbsolute ?? "",
  deltaPercent: change.deltaPercent ?? "",
})

export const toTemplateContext = (message: NotificationMessage): TemplateContext => ({
  event: message.event,
  monitor: { name: message.monitor.name, url: message.monitor.url },
  rule: { name: message.rule.name },
  change: message.changes[0] ? toTemplateChange(message.changes[0]) : EMPTY_CHANGE,
  changes: message.changes.map((change) => toTemplateChange(change)),
  run: { id: message.run.id, durationMs: message.run.durationMs },
  links: message.links,
})
