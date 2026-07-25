import { useEventListener } from "./use-event-listener"

export interface HotkeyOptions {
  readonly enabled?: boolean
  readonly preventDefault?: boolean
  readonly target?: EventTarget | null
}

interface ParsedCombo {
  readonly key: string
  readonly modifiers: ReadonlySet<string>
}

const MODIFIER_MOD = "mod"
const MODIFIER_META = "meta"
const MODIFIER_CTRL = "ctrl"
const MODIFIER_ALT = "alt"
const MODIFIER_SHIFT = "shift"

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"])

export const parseCombo = (combo: string): ParsedCombo => {
  const parts = combo
    .toLowerCase()
    .split("+")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  return { key: parts.at(-1) ?? "", modifiers: new Set(parts.slice(0, -1)) }
}

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  return EDITABLE_TAGS.has(target.tagName) || target.isContentEditable
}

export const isComboMatch = (combo: string, event: KeyboardEvent): boolean => {
  const { key, modifiers } = parseCombo(combo)

  if (modifiers.has(MODIFIER_MOD)) {
    if (!event.metaKey && !event.ctrlKey) return false
  } else {
    if (event.metaKey !== modifiers.has(MODIFIER_META)) return false
    if (event.ctrlKey !== modifiers.has(MODIFIER_CTRL)) return false
  }

  if (event.altKey !== modifiers.has(MODIFIER_ALT)) return false
  if (event.shiftKey !== modifiers.has(MODIFIER_SHIFT)) return false

  return event.key.toLowerCase() === key
}

export const useHotkey = (
  combo: string,
  handler: (event: KeyboardEvent) => void,
  options: HotkeyOptions = {},
): void => {
  const { enabled = true, preventDefault = true, target } = options
  const isBare = parseCombo(combo).modifiers.size === 0

  useEventListener(
    "keydown",
    (event) => {
      if (!enabled) return
      if (isBare && isEditableTarget(event.target)) return
      if (!isComboMatch(combo, event)) return
      if (preventDefault) event.preventDefault()
      handler(event)
    },
    target,
  )
}
