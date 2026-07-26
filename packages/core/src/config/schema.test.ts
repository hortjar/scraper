import type { Config } from "effect"
import { ConfigProvider, Effect, Redacted } from "effect"
import { describe, expect, it } from "vitest"

import { MAIL_DRIVER } from "../constants/domain-values.js"

import { databaseConfig, mailConfig, redisConfig } from "./schema.js"

const providerFor = (environment: Record<string, string>) => {
  const entries = Object.entries(environment)
  return ConfigProvider.fromMap(new Map(entries))
}

const load = <A>(config: Config.Config<A>, environment: Record<string, string>): Promise<A> => {
  const scoped = config.pipe(Effect.withConfigProvider(providerFor(environment)))
  return Effect.runPromise(scoped)
}

const databaseUrl = async (environment: Record<string, string>) => {
  const config = await load(databaseConfig, environment)
  return Redacted.value(config.url)
}

const redisUrl = async (environment: Record<string, string>) => {
  const config = await load(redisConfig, environment)
  return Redacted.value(config.url)
}

const BASE64_PASSWORD_WITH_URL_DELIMITERS = "aB+/cd==efg/hi+jk"
const WHITESPACE_ONLY = " ".repeat(3)

describe("database url", () => {
  it("is assembled from the parts, with compose-network defaults", async () => {
    await expect(databaseUrl({ POSTGRES_PASSWORD: "pw" })).resolves.toBe(
      "postgres://scraper:pw@postgres:5432/scraper",
    )
  })

  it("honours every part", async () => {
    await expect(
      databaseUrl({
        POSTGRES_DB: "prod",
        POSTGRES_HOST: "db.example.com",
        POSTGRES_PASSWORD: "pw",
        POSTGRES_PORT: "6543",
        POSTGRES_USER: "app",
      }),
    ).resolves.toBe("postgres://app:pw@db.example.com:6543/prod")
  })

  it("percent-encodes a password that would otherwise change the url's meaning", async () => {
    const url = new URL(
      await databaseUrl({ POSTGRES_PASSWORD: BASE64_PASSWORD_WITH_URL_DELIMITERS }),
    )

    expect(url.hostname).toBe("postgres")
    expect(url.port).toBe("5432")
    expect(decodeURIComponent(url.password)).toBe(BASE64_PASSWORD_WITH_URL_DELIMITERS)
  })

  it("percent-encodes a user containing an at sign", async () => {
    const url = new URL(await databaseUrl({ POSTGRES_PASSWORD: "pw", POSTGRES_USER: "app@tenant" }))

    expect(url.hostname).toBe("postgres")
    expect(decodeURIComponent(url.username)).toBe("app@tenant")
  })

  it("lets an explicit DATABASE_URL win, for a managed provider", async () => {
    await expect(
      databaseUrl({ DATABASE_URL: "postgres://provider/db", POSTGRES_PASSWORD: "pw" }),
    ).resolves.toBe("postgres://provider/db")
  })

  it("fails when neither the password nor a url is given", async () => {
    await expect(databaseUrl({})).rejects.toThrow()
  })
})

describe("redis url", () => {
  it("omits the credential separator entirely when no password is set", async () => {
    await expect(redisUrl({})).resolves.toBe("redis://redis:6379/0")
  })

  it("carries a password as userinfo with an empty username", async () => {
    await expect(redisUrl({ REDIS_DB: "3", REDIS_PASSWORD: "pw" })).resolves.toBe(
      "redis://:pw@redis:6379/3",
    )
  })

  it("percent-encodes a password containing url delimiters", async () => {
    const url = new URL(await redisUrl({ REDIS_PASSWORD: BASE64_PASSWORD_WITH_URL_DELIMITERS }))

    expect(decodeURIComponent(url.password)).toBe(BASE64_PASSWORD_WITH_URL_DELIMITERS)
  })

  it("lets an explicit REDIS_URL win", async () => {
    await expect(redisUrl({ REDIS_PASSWORD: "pw", REDIS_URL: "redis://provider/9" })).resolves.toBe(
      "redis://provider/9",
    )
  })
})

describe("mail availability", () => {
  it("is unavailable when nothing is configured", async () => {
    const mail = await load(mailConfig, {})

    expect(mail.isAvailable).toBe(false)
  })

  it("is unavailable on the smtp driver without a host", async () => {
    const mail = await load(mailConfig, { MAIL_FROM: "alerts@example.com" })

    expect(mail.isAvailable).toBe(false)
  })

  it("is unavailable with a host but no sender", async () => {
    const mail = await load(mailConfig, { SMTP_HOST: "smtp.example.com" })

    expect(mail.isAvailable).toBe(false)
  })

  it("treats whitespace as unset", async () => {
    const mail = await load(mailConfig, {
      MAIL_FROM: WHITESPACE_ONLY,
      SMTP_HOST: "smtp.example.com",
    })

    expect(mail.isAvailable).toBe(false)
  })

  it("is available on the smtp driver with a sender and a host", async () => {
    const mail = await load(mailConfig, {
      MAIL_FROM: "alerts@example.com",
      SMTP_HOST: "smtp.example.com",
    })

    expect(mail.isAvailable).toBe(true)
  })

  it("needs an api key on the resend driver, not an smtp host", async () => {
    const environment = { MAIL_DRIVER: MAIL_DRIVER.resend, MAIL_FROM: "alerts@example.com" }

    await expect(
      load(mailConfig, { ...environment, SMTP_HOST: "smtp.example.com" }),
    ).resolves.toMatchObject({ isAvailable: false })
    await expect(
      load(mailConfig, { ...environment, RESEND_API_KEY: "re_key" }),
    ).resolves.toMatchObject({ isAvailable: true })
  })

  it("needs only a sender on the console driver", async () => {
    const mail = await load(mailConfig, {
      MAIL_DRIVER: MAIL_DRIVER.console,
      MAIL_FROM: "alerts@example.com",
    })

    expect(mail.isAvailable).toBe(true)
  })
})
