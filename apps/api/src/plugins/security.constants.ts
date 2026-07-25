export const SECURITY_HEADER = {
  strictTransportSecurity: "Strict-Transport-Security",
  contentTypeOptions: "X-Content-Type-Options",
  frameOptions: "X-Frame-Options",
  referrerPolicy: "Referrer-Policy",
  contentSecurityPolicy: "Content-Security-Policy",
} as const

export const SECURITY_HEADER_VALUE = {
  strictTransportSecurity: "max-age=15552000; includeSubDomains",
  contentTypeOptions: "nosniff",
  frameOptions: "DENY",
  referrerPolicy: "strict-origin-when-cross-origin",
  contentSecurityPolicy:
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
    "font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
} as const
