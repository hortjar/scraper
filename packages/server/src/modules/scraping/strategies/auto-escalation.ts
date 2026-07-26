import { AUTO_ESCALATE } from "@scraper/core"

import { CHALLENGE_SIGNATURES, CHALLENGE_STATUS_CODES } from "../scraping.constants.js"

export const hasSpaMarkers = (html: string): boolean =>
  AUTO_ESCALATE.spaMarkers.some((marker) => html.includes(marker))

export const isChallengePage = (status: number, html: string): boolean =>
  (CHALLENGE_STATUS_CODES as readonly number[]).includes(status) &&
  CHALLENGE_SIGNATURES.some((pattern) => pattern.test(html))

export const isLikelySpaShell = (html: string, byteLength: number): boolean =>
  byteLength < AUTO_ESCALATE.minBytes && hasSpaMarkers(html)

export interface EscalationInput {
  readonly httpStatus: number
  readonly html: string
  readonly byteLength: number
  readonly allRequiredExtractorsMissing: boolean
}

export const shouldEscalate = (input: EscalationInput): boolean =>
  input.allRequiredExtractorsMissing ||
  isLikelySpaShell(input.html, input.byteLength) ||
  isChallengePage(input.httpStatus, input.html)
