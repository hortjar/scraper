import { render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { describe, expect, it } from "vitest"

import { i18n } from "../../../i18n"
import type { DiffHunk } from "../types"

import { DiffRenderer } from "./DiffRenderer"

const renderDiff = (hunks: readonly DiffHunk[], isChangedOnly?: boolean) =>
  render(
    <I18nextProvider i18n={i18n}>
      <DiffRenderer hunks={hunks} changedOnly={isChangedOnly} />
    </I18nextProvider>,
  )

const hunks: readonly DiffHunk[] = [
  { kind: "unchanged", value: "In stock at " },
  { kind: "removed", value: "$129.00" },
  { kind: "added", value: "$99.00" },
]

describe("DiffRenderer", () => {
  it("renders an empty state when there are no hunks", () => {
    renderDiff([])
    expect(screen.getByText(i18n.t("runs:diff.empty"))).toBeInTheDocument()
  })

  it("renders every hunk's text content", () => {
    renderDiff(hunks)
    expect(screen.getByText("In stock at", { exact: false })).toBeInTheDocument()
    expect(screen.getByText("$129.00", { exact: false })).toBeInTheDocument()
    expect(screen.getByText("$99.00", { exact: false })).toBeInTheDocument()
  })

  it("gives added and removed hunks visually distinct, non-color-only treatment", () => {
    renderDiff(hunks)
    const removed = screen.getByText("$129.00", { exact: false }).closest("div")
    const added = screen.getByText("$99.00", { exact: false }).closest("div")
    const unchanged = screen.getByText("In stock at", { exact: false }).closest("div")

    expect(removed?.className).toContain("negative")
    expect(removed?.className).toContain("line-through")
    expect(added?.className).toContain("positive")
    expect(unchanged?.className).not.toContain("positive")
    expect(unchanged?.className).not.toContain("negative")
  })

  it("labels each hunk for assistive technology, not color alone", () => {
    renderDiff(hunks)
    expect(screen.getByText(i18n.t("runs:diff.added"))).toHaveClass("sr-only")
    expect(screen.getByText(i18n.t("runs:diff.removed"))).toHaveClass("sr-only")
  })

  it("collapses unchanged hunks when changedOnly is set", () => {
    renderDiff(hunks, true)
    expect(screen.queryByText("In stock at", { exact: false })).not.toBeInTheDocument()
    expect(screen.getByText("$129.00", { exact: false })).toBeInTheDocument()
    expect(screen.getByText("$99.00", { exact: false })).toBeInTheDocument()
  })

  it("shows the empty message when changedOnly filters out everything", () => {
    renderDiff([{ kind: "unchanged", value: "nothing moved" }], true)
    expect(screen.getByText(i18n.t("runs:diff.empty"))).toBeInTheDocument()
  })
})
