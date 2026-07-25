import { useSelector } from "@tanstack/react-store"
import { Store } from "@tanstack/store"

import { hydrate, persist } from "./persist"

export const DENSITY = { comfortable: "comfortable", compact: "compact" } as const
export type Density = (typeof DENSITY)[keyof typeof DENSITY]

export const DIFF_VIEW = { inline: "inline", split: "split" } as const
export type DiffView = (typeof DIFF_VIEW)[keyof typeof DIFF_VIEW]

export interface UiState {
  readonly sidebarCollapsed: boolean
  readonly density: Density
  readonly diffView: DiffView
}

const NAME = "ui"

const defaults: UiState = {
  sidebarCollapsed: false,
  density: DENSITY.comfortable,
  diffView: DIFF_VIEW.inline,
}

const isUiState = (value: unknown): value is UiState => {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Partial<Record<keyof UiState, unknown>>
  return (
    typeof candidate.sidebarCollapsed === "boolean" &&
    typeof candidate.density === "string" &&
    Object.hasOwn(DENSITY, candidate.density) &&
    typeof candidate.diffView === "string" &&
    Object.hasOwn(DIFF_VIEW, candidate.diffView)
  )
}

export const uiStore = new Store<UiState>(hydrate(NAME, defaults, isUiState))

persist(uiStore, NAME)

export const useUi = <T>(selector: (state: UiState) => T): T => useSelector(uiStore, selector)

export const useSidebarCollapsed = (): boolean => useUi((state) => state.sidebarCollapsed)

export const useDensity = (): Density => useUi((state) => state.density)

export const useDiffView = (): DiffView => useUi((state) => state.diffView)

export const toggleSidebar = (): void => {
  uiStore.setState((state) => ({ ...state, sidebarCollapsed: !state.sidebarCollapsed }))
}

export const setDensity = (density: Density): void => {
  uiStore.setState((state) => ({ ...state, density }))
}

export const setDiffView = (diffView: DiffView): void => {
  uiStore.setState((state) => ({ ...state, diffView }))
}
