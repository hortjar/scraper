import { XPATH_MAX_STEPS } from "../scraping.constants.js"

interface DomElement {
  readonly tagName: string
  readonly children: readonly DomElement[]
  readonly textContent: string | null
  getAttribute(name: string): string | null
  hasAttribute(name: string): boolean
}

type Predicate = (element: DomElement, index: number) => boolean

type NodeTest =
  | { readonly kind: "tag"; readonly name: string }
  | { readonly kind: "wildcard" }
  | { readonly kind: "text" }
  | { readonly kind: "attr"; readonly name: string }

interface Step {
  readonly combinator: "child" | "descendant"
  readonly test: NodeTest
  readonly predicates: readonly Predicate[]
}

const isAlwaysMatching: Predicate = () => true

const parsePredicate = (raw: string): Predicate => {
  const trimmed = raw.trim()

  if (/^\d+$/.test(trimmed)) {
    const position = Number(trimmed)
    return (_element, index) => index === position - 1
  }

  const contains = /^contains\(@([\w-]+),\s*['"]([^'"]*)['"]\)$/.exec(trimmed)
  if (contains?.[1] !== undefined && contains[2] !== undefined) {
    const attribute = contains[1]
    const needle = contains[2]
    return (element) => (element.getAttribute(attribute) ?? "").includes(needle)
  }

  const equals = /^@([\w-]+)\s*=\s*['"]([^'"]*)['"]$/.exec(trimmed)
  if (equals?.[1] !== undefined && equals[2] !== undefined) {
    const attribute = equals[1]
    const value = equals[2]
    return (element) => element.getAttribute(attribute) === value
  }

  const exists = /^@([\w-]+)$/.exec(trimmed)
  if (exists?.[1] !== undefined) {
    const attribute = exists[1]
    return (element) => element.hasAttribute(attribute)
  }

  return isAlwaysMatching
}

const parseNodeTest = (name: string): NodeTest => {
  if (name === "text()") return { kind: "text" }
  if (name.startsWith("@")) return { kind: "attr", name: name.slice(1) }
  if (name === "*") return { kind: "wildcard" }
  return { kind: "tag", name: name.toLowerCase() }
}

const parseSegment = (
  segment: string,
): { readonly test: NodeTest; readonly predicates: readonly Predicate[] } => {
  const bracketStart = segment.indexOf("[")
  if (bracketStart === -1) return { test: parseNodeTest(segment), predicates: [] }

  const name = segment.slice(0, bracketStart)
  const predicates: Predicate[] = []
  const predicatePattern = /\[([^\]]*)\]/g
  for (const match of segment.slice(bracketStart).matchAll(predicatePattern)) {
    if (match[1] !== undefined) predicates.push(parsePredicate(match[1]))
  }
  return { test: parseNodeTest(name), predicates }
}

const QUOTE_CHARACTERS = new Set(["'", '"'])

const nextQuote = (current: string | null, char: string): string | null => {
  if (current !== null) return char === current ? null : current
  return QUOTE_CHARACTERS.has(char) ? char : null
}

const splitPath = (path: string): readonly string[] => {
  const parts: string[] = []
  let current = ""
  let depth = 0
  let quote: string | null = null

  const flush = (): void => {
    if (current !== "") parts.push(current)
    current = ""
  }

  for (let index = 0; index < path.length; index += 1) {
    const char = path[index] ?? ""
    const wasQuoted = quote !== null
    quote = nextQuote(quote, char)
    if (wasQuoted || quote !== null) {
      current += char
      continue
    }
    if (char === "[") depth += 1
    else if (char === "]") depth -= 1
    if (char !== "/" || depth !== 0) {
      current += char
      continue
    }
    flush()
    const isDescendant = path[index + 1] === "/"
    parts.push(isDescendant ? "//" : "/")
    if (isDescendant) index += 1
  }
  flush()
  return parts
}

export const parseXPath = (path: string): readonly Step[] => {
  const parts = splitPath(path)
  const steps: Step[] = []
  let combinator: "child" | "descendant" = "child"

  for (const part of parts) {
    if (part === "//") {
      combinator = "descendant"
      continue
    }
    if (part === "/") {
      combinator = "child"
      continue
    }
    const { test, predicates } = parseSegment(part)
    steps.push({ combinator, test, predicates })
    combinator = "child"
    if (steps.length > XPATH_MAX_STEPS) break
  }

  return steps
}

const collectDescendants = (element: DomElement): readonly DomElement[] => {
  const result: DomElement[] = []
  const walk = (node: DomElement): void => {
    for (const child of node.children) {
      result.push(child)
      walk(child)
    }
  }
  walk(element)
  return result
}

const isMatchingTag = (element: DomElement, test: NodeTest): boolean => {
  if (test.kind === "wildcard") return true
  if (test.kind === "tag") return element.tagName.toLowerCase() === test.name
  return false
}

const applyElementStep = (contexts: readonly DomElement[], step: Step): readonly DomElement[] => {
  const results: DomElement[] = []
  for (const context of contexts) {
    const candidates =
      step.combinator === "child" ? [...context.children] : collectDescendants(context)
    const matched = candidates.filter((element) => isMatchingTag(element, step.test))
    let filtered: readonly DomElement[] = matched
    for (const predicate of step.predicates) {
      filtered = filtered.filter((element, index) => predicate(element, index))
    }
    results.push(...filtered)
  }
  return results
}

const applyElementSteps = (steps: readonly Step[], root: DomElement): readonly DomElement[] => {
  let contexts: readonly DomElement[] = [root]
  for (const step of steps) contexts = applyElementStep(contexts, step)
  return contexts
}

export const evaluateXPath = (root: DomElement, path: string): readonly string[] => {
  const steps = parseXPath(path)
  const lastStep = steps.at(-1)
  if (lastStep === undefined) return []

  if (lastStep.test.kind === "text" || lastStep.test.kind === "attr") {
    const contexts = applyElementSteps(steps.slice(0, -1), root)

    if (lastStep.test.kind === "text") {
      return contexts.map((element) => element.textContent ?? "")
    }

    const attribute = lastStep.test.name
    const values: string[] = []
    for (const element of contexts) {
      const value = element.getAttribute(attribute)
      if (value !== null) values.push(value)
    }
    return values
  }

  const contexts = applyElementSteps(steps, root)
  return contexts.map((element) => element.textContent ?? "")
}
