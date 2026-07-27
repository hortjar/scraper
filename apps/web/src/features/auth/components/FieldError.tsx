import { useTranslation } from "react-i18next"

export interface FieldErrorProperties {
  readonly id: string
  readonly messageKey: string | undefined
}

export const FieldError = ({ id, messageKey }: FieldErrorProperties) => {
  const { t } = useTranslation("auth")

  if (messageKey === undefined) return null

  const translate = t as unknown as (key: string) => string

  return (
    <p id={id} role="alert" className="text-small text-negative">
      {translate(messageKey)}
    </p>
  )
}
