export const hasVersionSkew = (version: string, serverVersion?: string): boolean =>
  serverVersion !== undefined && serverVersion.length > 0 && serverVersion !== version
