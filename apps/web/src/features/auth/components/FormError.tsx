import { useErrorMessage } from "../../../lib/api"

export interface FormErrorProperties {
  readonly error: unknown
}

export const FormError = ({ error }: FormErrorProperties) => {
  const describe = useErrorMessage()

  if (error === null || error === undefined) return null

  return (
    <p
      role="alert"
      className="rounded-md border border-negative bg-negative-soft px-3 py-2 text-small text-negative-ink"
    >
      {describe(error)}
    </p>
  )
}
