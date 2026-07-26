import { Data } from "effect"

export class BreachCheckUnavailable extends Data.TaggedError("BreachCheckUnavailable")<{
  readonly detail: string
}> {}

export class MailSendFailed extends Data.TaggedError("MailSendFailed")<{
  readonly detail: string
}> {}

export class HashingFailed extends Data.TaggedError("HashingFailed")<{
  readonly operation: "hash" | "verify"
  readonly detail: string
}> {}
