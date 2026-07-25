import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { isComboMatch, parseCombo, useHotkey } from "./use-hotkey"

const press = (init: KeyboardEventInit) => {
  dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, ...init }))
}

describe("parseCombo", () => {
  it("splits modifiers from the key", () => {
    const parsed = parseCombo("Mod+Shift+K")
    expect(parsed.key).toBe("k")
    expect([...parsed.modifiers].toSorted((a, b) => a.localeCompare(b))).toEqual(["mod", "shift"])
  })
})

describe("isComboMatch", () => {
  it("treats mod as meta or ctrl", () => {
    expect(isComboMatch("mod+k", new KeyboardEvent("keydown", { key: "k", metaKey: true }))).toBe(
      true,
    )
    expect(isComboMatch("mod+k", new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))).toBe(
      true,
    )
    expect(isComboMatch("mod+k", new KeyboardEvent("keydown", { key: "k" }))).toBe(false)
  })

  it("requires exact alt and shift state", () => {
    expect(isComboMatch("k", new KeyboardEvent("keydown", { key: "k", shiftKey: true }))).toBe(
      false,
    )
    expect(isComboMatch("k", new KeyboardEvent("keydown", { key: "k" }))).toBe(true)
  })
})

describe("useHotkey", () => {
  it("fires on a matching combo", () => {
    const spy = vi.fn()
    renderHook(() => {
      useHotkey("mod+k", spy)
    })

    act(() => {
      press({ key: "k", metaKey: true })
    })
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it("does not fire when disabled", () => {
    const spy = vi.fn()
    renderHook(() => {
      useHotkey("mod+k", spy, { enabled: false })
    })

    act(() => {
      press({ key: "k", metaKey: true })
    })
    expect(spy).not.toHaveBeenCalled()
  })

  it("ignores bare keys typed into a field", () => {
    const spy = vi.fn()
    const input = document.createElement("input")
    document.body.append(input)
    renderHook(() => {
      useHotkey("j", spy)
    })

    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "j", bubbles: true }))
    })
    expect(spy).not.toHaveBeenCalled()

    input.remove()
  })
})
