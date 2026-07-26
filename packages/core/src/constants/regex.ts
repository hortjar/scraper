export const PATTERN = {
  extractorKey: /^[a-z][a-z0-9_]{0,63}$/,
  ianaTimezone: /^[A-Za-z]+(?:\/[A-Za-z0-9_+-]+)+$|^UTC$/,
  cronFiveField:
    /^(\*|[0-5]?\d)(\/\d+)?(,(\*|[0-5]?\d))*\s+(\*|1?\d|2[0-3])(\/\d+)?(,(\*|1?\d|2[0-3]))*\s+(\*|[12]?\d|3[01])(\/\d+)?\s+(\*|[1-9]|1[0-2])(\/\d+)?\s+(\*|[0-6])(\/\d+)?$/,
  quietHourTime: /^([01]\d|2[0-3]):([0-5]\d)$/,
  hexColor: /^#[0-9a-fA-F]{6}$/,
  privateIpv4:
    /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/,
  loopbackHost: /^(localhost|127\.\d+\.\d+\.\d+|\[?::1\]?|0\.0\.0\.0)$/i,
  blockedTld: /\.(local|internal|localdomain|home\.arpa)$/i,
  jsonLdScript: /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  htmlComment: /<!--[\s\S]*?-->/g,
  scriptOrStyle: /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,
  whitespaceRun: /\s+/g,
  bearerToken: /^Bearer\s+(.+)$/i,
  apiKeyFormat: /^sk_([a-zA-Z0-9]{8})_([A-Za-z0-9_-]{20,})$/,
  localePart: /^[a-z]{2}(-[A-Z]{2})?$/,
} as const
