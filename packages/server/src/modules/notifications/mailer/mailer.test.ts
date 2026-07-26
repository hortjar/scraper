import { it } from "@effect/vitest"
import { Effect } from "effect"
import { describe, expect } from "vitest"

import { withTestConfig } from "../test-support/test-config.js"

import { Mailer } from "./mailer.service.js"

const run = <A, E>(effect: Effect.Effect<A, E, Mailer>, overrides?: Record<string, string>) =>
  effect.pipe(Effect.provide(Mailer.Default), withTestConfig(overrides))

describe("Mailer", () => {
  it.effect("uses the console driver by default and returns a synthetic message id", () =>
    run(
      Effect.gen(function* () {
        const mailer = yield* Mailer
        const receipt = yield* mailer.send({
          to: "user@example.com",
          subject: "Test message from Scraper",
          text: "This channel is set up correctly.",
        })
        expect(receipt.messageId).toMatch(/^console-\d+$/)
      }),
      { MAIL_DRIVER: "console", MAIL_FROM: "alerts@example.com" },
    ),
  )

  it.effect("fails fast when mail is not configured", () =>
    run(
      Effect.gen(function* () {
        const mailer = yield* Mailer
        expect(mailer.isAvailable).toBe(false)
        const result = yield* Effect.flip(
          mailer.send({ to: "user@example.com", subject: "s", text: "b" }),
        )
        expect(result._tag).toBe("MailDeliveryFailed")
        expect(result.reason).toBe("not_configured")
      }),
      { MAIL_DRIVER: "smtp", MAIL_FROM: "", SMTP_HOST: "" },
    ),
  )

  it.effect("is available once smtp host and from address are set", () =>
    run(
      Effect.gen(function* () {
        const mailer = yield* Mailer
        expect(mailer.isAvailable).toBe(true)
      }),
      { MAIL_DRIVER: "smtp", MAIL_FROM: "alerts@example.com", SMTP_HOST: "smtp.example.com" },
    ),
  )
})
