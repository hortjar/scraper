import { describe, expect, it } from "vitest"

import { formatApiKey, parseApiKey } from "./api-keys.service.js"

const PREFIX = "EoBEfG9p"

describe("parseApiKey", () => {
  it("accepts a secret containing base64url underscores and dashes", () => {
    const raw = formatApiKey(PREFIX, "MJiUWlqyPcLvjXl4X7aVEuKobRm_Ty998yS7Sr-XskHc")
    expect(parseApiKey(raw)).toEqual({ prefix: PREFIX, raw })
  })

  it("round-trips every formatted key regardless of separators in the secret", () => {
    const secrets = [
      "abcdefghijklmnopqrstuvwxyz012345",
      "____abcdefghijklmnopqrstuvwxyz01",
      "----abcdefghijklmnopqrstuvwxyz01",
      "a_b-c_d-e_f-g_h-i_j-k_l-m_n-o_p1",
    ]
    for (const secret of secrets) {
      const raw = formatApiKey(PREFIX, secret)
      expect(parseApiKey(raw)?.prefix).toBe(PREFIX)
      expect(parseApiKey(raw)?.raw).toBe(raw)
    }
  })

  it("rejects a malformed key", () => {
    expect(parseApiKey("nope")).toBeNull()
    expect(parseApiKey("sk_short_abc")).toBeNull()
    expect(parseApiKey(`sk_${PREFIX}_tooshort`)).toBeNull()
    expect(parseApiKey(`pk_${PREFIX}_abcdefghijklmnopqrstuvwxyz01`)).toBeNull()
  })
})
