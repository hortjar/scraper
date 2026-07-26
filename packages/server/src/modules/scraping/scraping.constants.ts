export const MAX_REDIRECTS = 10

export const TITLE_SELECTOR = "title"

export const BROWSER_TOKEN_PARAMETER = "token"

export const TOO_LARGE_SENTINEL = "scraping/too-large"

export const SEE_OTHER_STATUS = 303

export const FOLLOWED_REDIRECT_STATUSES: readonly number[] = [301, 302, 303, 307, 308]

export const ROBOTS_PATH = "/robots.txt"
export const ROBOTS_WILDCARD_AGENT = "*"
export const ROBOTS_MAX_BYTES = 524_288
export const ROBOTS_FETCH_TIMEOUT_MS = 10_000

export const CHALLENGE_STATUS_CODES = [403, 429, 503] as const

export const CHALLENGE_SIGNATURES = [
  /checking your browser/i,
  /cf-browser-verification/i,
  /cf-chl-bypass/i,
  /attention required.{0,40}cloudflare/is,
  /captcha-delivery/i,
  /just a moment\.\.\./i,
  /ddos protection by/i,
  /access denied.{0,40}reference #/is,
] as const

export const NORMALIZE_SAFE_ATTRIBUTES = ["href", "src", "alt", "title"] as const

export const BLOCK_LEVEL_TAGS = [
  "p",
  "div",
  "section",
  "article",
  "header",
  "footer",
  "main",
  "aside",
  "nav",
  "ul",
  "ol",
  "li",
  "table",
  "tr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "br",
  "hr",
  "blockquote",
  "pre",
] as const

export const STRIPPED_TAGS = ["script", "style", "noscript", "template", "svg"] as const

export const DEFAULT_VIEWPORT = { width: 1366, height: 900 } as const
export const SCROLL_STEP_PIXELS = 2000

export const JSON_LD_SELECTOR = 'script[type="application/ld+json"]'

export const JSON_LD_MAX_DOCUMENTS = 20

export const XPATH_MAX_STEPS = 32
export const JSONPATH_MAX_SEGMENTS = 32

export const PREVIEW_NORMALIZED_MAX_CHARS = 20_000

export const HTML_TAG_PATTERN = /<[^>]+>/g

export const CURRENCY_SYMBOL_MAP: Readonly<Record<string, string>> = {
  $: "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  Kč: "CZK",
}

export const DEFAULT_REGEX_EXTRACT_GROUP = 1
