import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/Select"

export interface SelectOption<T extends string> {
  readonly value: T
  readonly label: string
}

export interface OptionSelectProperties<T extends string> {
  readonly id: string
  readonly value: T
  readonly options: readonly SelectOption<T>[]
  readonly onChange: (value: T) => void
  readonly disabled?: boolean | undefined
}

export const OptionSelect = <T extends string>({
  id,
  value,
  options,
  onChange,
  disabled,
}: OptionSelectProperties<T>) => (
  <Select
    value={value}
    disabled={disabled ?? false}
    onValueChange={(next) => {
      const match = options.find((option) => option.value === next)
      if (match !== undefined) onChange(match.value)
    }}
  >
    <SelectTrigger id={id}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {options.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)
