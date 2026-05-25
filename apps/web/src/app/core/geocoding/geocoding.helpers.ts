/** Snapshot of a failed geocode Edge Function call (subset used for availability). */
export interface GeocodeFailureSnapshot {
  status: number | null;
  message: string;
  bodySnippet: string | null;
}

/** True when the Edge runtime or gateway is down (not a bad client request). */
export function isGeocodeInfrastructureFailure(details: GeocodeFailureSnapshot): boolean {
  const status = details.status;
  if (status != null) {
    if (status === 401 || status === 403) return false;
    if (status >= 500 || status === 503) return true;
    return false;
  }

  const haystack = `${details.message} ${details.bodySnippet ?? ''}`.toLowerCase();
  if (haystack.includes('boot_error') || haystack.includes('worker failed to boot')) {
    return true;
  }
  if (haystack.includes('failed to fetch') || haystack.includes('networkerror')) {
    return true;
  }
  return false;
}
