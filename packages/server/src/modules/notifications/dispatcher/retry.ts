import { RETRY } from "@scraper/core/constants"
import type { DeliveryFailed } from "@scraper/core/errors"
import { Duration, Effect } from "effect"

const backoffFor = (attemptNumber: number): number =>
  Math.min(RETRY.backoffBaseMs * 2 ** (attemptNumber - 1), RETRY.backoffMaxMs)

export interface RetryOutcome<A> {
  readonly value: A
  readonly attempts: number
}

export const withNotifyRetry = <A, R>(
  attempt: (attemptNumber: number) => Effect.Effect<A, DeliveryFailed, R>,
): Effect.Effect<RetryOutcome<A>, DeliveryFailed, R> =>
  Effect.gen(function* () {
    for (let attemptNumber = 1; attemptNumber <= RETRY.notifyAttempts; attemptNumber++) {
      const result = yield* Effect.either(attempt(attemptNumber))
      if (result._tag === "Right") return { value: result.right, attempts: attemptNumber }
      if (!result.left.retryable || attemptNumber === RETRY.notifyAttempts) {
        return yield* Effect.fail(result.left)
      }
      yield* Effect.sleep(Duration.millis(backoffFor(attemptNumber)))
    }
    return yield* Effect.die("unreachable: retry loop exited without a result")
  })
