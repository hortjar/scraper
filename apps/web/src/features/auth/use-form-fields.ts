import { useState } from "react"

export interface FormFields<T> {
  readonly values: T
  readonly setField: <K extends keyof T>(field: K, value: T[K]) => void
  readonly reset: (values: T) => void
}

export const useFormFields = <T>(initial: T): FormFields<T> => {
  const [values, setValues] = useState<T>(initial)

  const setField = <K extends keyof T>(field: K, value: T[K]): void => {
    setValues((current) => ({ ...current, [field]: value }))
  }

  return { values, setField, reset: setValues }
}
