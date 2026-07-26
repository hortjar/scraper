import { createHmac } from "node:crypto"

const SIGNATURE_PREFIX = "sha256="
const HMAC_ALGORITHM = "sha256"

export const signWebhookPayload = (secret: string, timestamp: string, body: string): string =>
  `${SIGNATURE_PREFIX}${createHmac(HMAC_ALGORITHM, secret).update(`${timestamp}.${body}`).digest("hex")}`
