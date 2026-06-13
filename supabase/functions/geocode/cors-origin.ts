/** Returns true when `origin` matches an allow-list entry (exact or `*` wildcard). */
export function isOriginAllowed(origin: string, allowedOrigins: readonly string[]): boolean {
  for (const allowed of allowedOrigins) {
    if (allowed === origin) {
      return true;
    }

    if (!allowed.includes("*")) {
      continue;
    }

    const pattern =
      "^" +
      allowed.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]+") +
      "$";
    if (new RegExp(pattern).test(origin)) {
      return true;
    }
  }

  return false;
}

/** Resolves the request origin when it is allow-listed; otherwise null (fail-closed). */
export function resolveAllowedOrigin(
  origin: string | null,
  allowedOrigins: readonly string[],
): string | null {
  if (!origin) {
    return null;
  }

  if (allowedOrigins.length === 0) {
    return null;
  }

  return isOriginAllowed(origin, allowedOrigins) ? origin : null;
}
