export interface RobotsRule {
  readonly path: string
  readonly allow: boolean
}

export interface RobotsGroup {
  readonly agents: readonly string[]
  readonly rules: readonly RobotsRule[]
  readonly crawlDelaySeconds: number | null
}

export interface RobotsRuleSet {
  readonly groups: readonly RobotsGroup[]
}

export const EMPTY_ROBOTS_RULE_SET: RobotsRuleSet = { groups: [] }

interface MutableGroup {
  agents: string[]
  rules: RobotsRule[]
  crawlDelaySeconds: number | null
}

const splitDirective = (
  line: string,
): { readonly field: string; readonly value: string } | null => {
  const colonIndex = line.indexOf(":")
  if (colonIndex === -1) return null
  return {
    field: line.slice(0, colonIndex).trim().toLowerCase(),
    value: line.slice(colonIndex + 1).trim(),
  }
}

interface ParseState {
  readonly groups: MutableGroup[]
  activeGroup: MutableGroup | null
  isSawDirective: boolean
}

const applyUserAgent = (state: ParseState, value: string): void => {
  if (state.activeGroup === null || state.isSawDirective) {
    state.activeGroup = { agents: [], rules: [], crawlDelaySeconds: null }
    state.groups.push(state.activeGroup)
    state.isSawDirective = false
  }
  state.activeGroup.agents.push(value.toLowerCase())
}

const applyRule = (group: MutableGroup, field: string, value: string): void => {
  if (value === "" && field === ROBOTS_FIELD.disallow) return
  group.rules.push({ path: value, allow: field === ROBOTS_FIELD.allow })
}

const applyCrawlDelay = (group: MutableGroup, value: string): void => {
  const seconds = Number(value)
  if (!Number.isNaN(seconds)) group.crawlDelaySeconds = seconds
}

const applyDirective = (state: ParseState, field: string, value: string): void => {
  if (field === ROBOTS_FIELD.userAgent) {
    applyUserAgent(state, value)
    return
  }
  const group = state.activeGroup
  if (group === null) return

  if (field === ROBOTS_FIELD.disallow || field === ROBOTS_FIELD.allow) {
    state.isSawDirective = true
    applyRule(group, field, value)
    return
  }
  if (field === ROBOTS_FIELD.crawlDelay) {
    state.isSawDirective = true
    applyCrawlDelay(group, value)
  }
}

export const parseRobotsTxt = (text: string): RobotsRuleSet => {
  const state: ParseState = { groups: [], activeGroup: null, isSawDirective: false }

  for (const rawLine of text.split(LINE_BREAK_PATTERN)) {
    const line = (rawLine.split(COMMENT_MARKER, 1)[0] ?? "").trim()
    if (line === "") continue
    const directive = splitDirective(line)
    if (directive === null) continue
    applyDirective(state, directive.field, directive.value)
  }

  return { groups: state.groups }
}

const WILDCARD_AGENT = "*"

const LINE_BREAK_PATTERN = /\r\n|\r|\n/
const COMMENT_MARKER = "#"

const ROBOTS_FIELD = {
  userAgent: "user-agent",
  disallow: "disallow",
  allow: "allow",
  crawlDelay: "crawl-delay",
} as const

const selectGroup = (groups: readonly RobotsGroup[], userAgent: string): RobotsGroup | null => {
  const lowerAgent = userAgent.toLowerCase()
  let bestSpecific: RobotsGroup | null = null
  let bestSpecificLength = -1
  let wildcard: RobotsGroup | null = null

  const longestMatchingAgent = (agents: readonly string[]): number => {
    let longest = -1
    for (const agent of agents) {
      if (agent === WILDCARD_AGENT) continue
      if (lowerAgent !== agent && !lowerAgent.startsWith(agent)) continue
      if (agent.length > longest) longest = agent.length
    }
    return longest
  }

  for (const group of groups) {
    if (group.agents.includes(WILDCARD_AGENT)) wildcard ??= group
    const matched = longestMatchingAgent(group.agents)
    if (matched > bestSpecificLength) {
      bestSpecific = group
      bestSpecificLength = matched
    }
  }

  return bestSpecific ?? wildcard
}

const escapeForPattern = (value: string): string =>
  value.replaceAll(/[.+^${}()|[\]\\]/g, String.raw`\$&`)

const isPathMatching = (rulePath: string, path: string): boolean => {
  if (rulePath === "") return true
  const isAnchored = rulePath.endsWith("$")
  const body = isAnchored ? rulePath.slice(0, -1) : rulePath
  const pattern = new RegExp(
    `^${escapeForPattern(body).replaceAll("*", ".*")}${isAnchored ? "$" : ""}`,
  )
  return pattern.test(path)
}

export interface RobotsDecision {
  readonly allowed: boolean
  readonly crawlDelaySeconds: number | null
}

export const evaluateRobots = (
  ruleSet: RobotsRuleSet,
  userAgent: string,
  path: string,
): RobotsDecision => {
  const group = selectGroup(ruleSet.groups, userAgent)
  if (group === null) return { allowed: true, crawlDelaySeconds: null }

  const matches = group.rules.filter((rule) => isPathMatching(rule.path, path))
  if (matches.length === 0) return { allowed: true, crawlDelaySeconds: group.crawlDelaySeconds }

  let winner = matches[0]
  if (winner === undefined) return { allowed: true, crawlDelaySeconds: group.crawlDelaySeconds }
  for (const rule of matches.slice(1)) {
    const isLonger = rule.path.length > winner.path.length
    const isTieBrokenByAllow =
      rule.path.length === winner.path.length && rule.allow && !winner.allow
    if (isLonger || isTieBrokenByAllow) winner = rule
  }

  return { allowed: winner.allow, crawlDelaySeconds: group.crawlDelaySeconds }
}
