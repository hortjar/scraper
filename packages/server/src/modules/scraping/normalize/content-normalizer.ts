import { createHash } from "node:crypto"

import { IGNORE_RULE_KIND, PATTERN, type IgnoreRule } from "@scraper/core"

import { attributeNames, parseFragment, queryAll, type DomElement } from "../dom.types.js"
import {
  BLOCK_LEVEL_TAGS,
  HTML_TAG_PATTERN,
  NORMALIZE_SAFE_ATTRIBUTES,
  STRIPPED_TAGS,
} from "../scraping.constants.js"

export interface NormalizeResult {
  readonly normalized: string
  readonly contentHash: string
}

const applySelectorIgnoreRules = (root: DomElement, rules: readonly IgnoreRule[]): void => {
  for (const rule of rules) {
    if (rule.kind !== IGNORE_RULE_KIND.selector) continue
    try {
      for (const element of queryAll(root, rule.value)) element.remove()
    } catch {
      continue
    }
  }
}

const removeStrippedTags = (root: DomElement): void => {
  for (const tag of STRIPPED_TAGS) {
    for (const element of queryAll(root, tag)) element.remove()
  }
}

const stripAttributes = (root: DomElement): void => {
  const elements: readonly DomElement[] = [root, ...queryAll(root, "*")]
  for (const element of elements) {
    for (const name of attributeNames(element)) {
      if (!(NORMALIZE_SAFE_ATTRIBUTES as readonly string[]).includes(name))
        element.removeAttribute(name)
    }
  }
}

const applyRegexIgnoreRules = (html: string, rules: readonly IgnoreRule[]): string => {
  let current = html
  for (const rule of rules) {
    if (rule.kind !== IGNORE_RULE_KIND.regex) continue
    try {
      current = current.replaceAll(new RegExp(rule.value, "g"), "")
    } catch {
      continue
    }
  }
  return current
}

const BLOCK_CLOSE_PATTERN = new RegExp(String.raw`</(?:${BLOCK_LEVEL_TAGS.join("|")})\s*>`, "gi")
const SELF_CLOSING_BREAK_PATTERN = /<(?:br|hr)\s*\/?\s*>/gi

const toBlockText = (html: string): string =>
  html
    .replaceAll(SELF_CLOSING_BREAK_PATTERN, "\n")
    .replace(BLOCK_CLOSE_PATTERN, "\n")
    .replace(HTML_TAG_PATTERN, "")

const ENTITY_PATTERN = /&(?:amp|lt|gt|quot|#39|apos|nbsp);/g
const ENTITY_MAP: Readonly<Record<string, string>> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
}

const decodeEntities = (value: string): string =>
  value.replaceAll(ENTITY_PATTERN, (entity) => ENTITY_MAP[entity] ?? entity)

const collapseBlocks = (text: string): string =>
  text
    .split("\n")
    .map((line) => line.replace(PATTERN.whitespaceRun, " ").trim())
    .filter((line) => line !== "")
    .join("\n")

const sha256Hex = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex")

export const normalizeContent = (
  html: string,
  contentSelector: string | null,
  ignoreRules: readonly IgnoreRule[],
): NormalizeResult => {
  const { body, document } = parseFragment(html)
  const trimmedSelector = contentSelector?.trim() ?? ""
  const root = trimmedSelector === "" ? body : (document.querySelector(trimmedSelector) ?? body)

  applySelectorIgnoreRules(root, ignoreRules)
  removeStrippedTags(root)
  stripAttributes(root)

  const withoutComments = (root.outerHTML ?? "").replace(PATTERN.htmlComment, "")
  const withoutIgnoredRegex = applyRegexIgnoreRules(withoutComments, ignoreRules)
  const normalized = collapseBlocks(decodeEntities(toBlockText(withoutIgnoredRegex)))

  return { normalized, contentHash: sha256Hex(normalized) }
}
