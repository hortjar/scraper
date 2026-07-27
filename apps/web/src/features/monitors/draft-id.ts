const PREFIX = "draft"

const counter = { value: 0 }

export const nextDraftId = (): string => {
  counter.value += 1
  return `${PREFIX}-${String(counter.value)}`
}

export const resetDraftIds = (): void => {
  counter.value = 0
}
