import { describe, expect, it } from "vitest"

import { digestCronRejection, mergedDigestShape } from "./rules.validation.js"

describe("digestCronRejection", () => {
  it("rejects a digest rule with no cron — nothing would ever drain its bucket", () => {
    const rejection = digestCronRejection({ deliveryMode: "digest", digestCron: null })

    expect(rejection?.issues).toEqual([
      { path: ["digestCron"], messageKey: "errors.digestCronRequired" },
    ])
  })

  it("accepts a digest rule with a cron", () => {
    expect(digestCronRejection({ deliveryMode: "digest", digestCron: "0 9 * * *" })).toBeNull()
  })

  it("ignores an immediate rule, which never uses the bucket", () => {
    expect(digestCronRejection({ deliveryMode: "immediate", digestCron: null })).toBeNull()
  })
})

describe("mergedDigestShape", () => {
  const current = { deliveryMode: "immediate", digestCron: null } as const

  it("catches a switch to digest that leaves the cron unset", () => {
    const merged = mergedDigestShape(current, { deliveryMode: "digest" })

    expect(merged).toEqual({ deliveryMode: "digest", digestCron: null })
    expect(digestCronRejection(merged)).not.toBeNull()
  })

  it("catches a cron cleared on a rule that is already digest", () => {
    const merged = mergedDigestShape(
      { deliveryMode: "digest", digestCron: "0 9 * * *" },
      { digestCron: null },
    )

    expect(digestCronRejection(merged)).not.toBeNull()
  })

  it("keeps the stored cron when the patch does not mention it", () => {
    const merged = mergedDigestShape({ deliveryMode: "digest", digestCron: "0 9 * * *" }, {})

    expect(merged.digestCron).toBe("0 9 * * *")
    expect(digestCronRejection(merged)).toBeNull()
  })

  it("distinguishes an absent field from an explicit null", () => {
    expect(
      mergedDigestShape({ deliveryMode: "digest", digestCron: "0 9 * * *" }, {}).digestCron,
    ).toBe("0 9 * * *")
    expect(
      mergedDigestShape({ deliveryMode: "digest", digestCron: "0 9 * * *" }, { digestCron: null })
        .digestCron,
    ).toBeNull()
  })
})
