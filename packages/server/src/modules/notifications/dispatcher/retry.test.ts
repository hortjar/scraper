import { it } from "@effect/vitest"
import { CHANNEL_KIND } from "@scraper/core/constants"
import { DeliveryFailed } from "@scraper/core/errors"
import { Effect, Exit, TestClock } from "effect"
import { describe, expect } from "vitest"

import { withNotifyRetry } from "./retry.js"

const failure = (isRetryable: boolean) =>
  new DeliveryFailed({ channelKind: CHANNEL_KIND.webhook, retryable: isRetryable, detail: "boom" })

describe("withNotifyRetry", () => {
  it.effect("returns immediately on first-attempt success", () =>
    Effect.gen(function* () {
      const outcome = yield* withNotifyRetry(() => Effect.succeed("ok"))
      expect(outcome).toEqual({ value: "ok", attempts: 1 })
    }),
  )

  it.effect("retries a retryable failure and succeeds on a later attempt", () =>
    Effect.gen(function* () {
      const fiber = yield* Effect.fork(
        withNotifyRetry((attemptNumber) =>
          attemptNumber < 3 ? Effect.fail(failure(true)) : Effect.succeed("recovered"),
        ),
      )
      yield* TestClock.adjust("10 minutes")
      const exit = yield* fiber.await
      expect(Exit.isSuccess(exit)).toBe(true)
      if (Exit.isSuccess(exit)) expect(exit.value).toEqual({ value: "recovered", attempts: 3 })
    }),
  )

  it.effect("does not retry a terminal failure", () =>
    Effect.gen(function* () {
      let calls = 0
      const result = yield* Effect.flip(
        withNotifyRetry(() => {
          calls += 1
          return Effect.fail(failure(false))
        }),
      )
      expect(calls).toBe(1)
      expect(result.retryable).toBe(false)
    }),
  )

  it.effect("gives up after the configured attempt count", () =>
    Effect.gen(function* () {
      let calls = 0
      const fiber = yield* Effect.fork(
        withNotifyRetry(() => {
          calls += 1
          return Effect.fail(failure(true))
        }),
      )
      yield* TestClock.adjust("1 hour")
      const exit = yield* fiber.await
      expect(exit._tag).toBe("Failure")
      expect(calls).toBe(5)
    }),
  )

  it.effect("waits with exponential backoff between attempts", () =>
    Effect.gen(function* () {
      const timestamps: number[] = []
      const fiber = yield* Effect.fork(
        withNotifyRetry((attemptNumber) =>
          Effect.gen(function* () {
            timestamps.push(yield* Effect.map(TestClock.currentTimeMillis, (ms) => ms))
            return attemptNumber < 3 ? yield* Effect.fail(failure(true)) : "done"
          }),
        ),
      )
      yield* TestClock.adjust("10 minutes")
      yield* fiber.await
      expect(timestamps[1]! - timestamps[0]!).toBe(30_000)
      expect(timestamps[2]! - timestamps[1]!).toBe(60_000)
    }),
  )
})
