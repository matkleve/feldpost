/**
 * Session-scoped in-flight content-hash registry.
 * Prevents duplicate uploads when two identical files race inside the concurrency window
 * before the first job registers its hash in `dedup_hashes`.
 *
 * @see docs/audits/upload-flow-review-2026-09-10/02-new-issues.md NF-04
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.dedup-scope.supplement.md
 */

export type InflightDedupEntry = {
  jobId: string;
  registeredByUserId: string;
};

const inflightByHash = new Map<string, InflightDedupEntry>();

export function lookupInflightDedupHash(contentHash: string): InflightDedupEntry | undefined {
  return inflightByHash.get(contentHash);
}

/** Returns false when another job already reserved this hash. */
export function tryRegisterInflightDedupHash(
  contentHash: string,
  entry: InflightDedupEntry,
): boolean {
  if (inflightByHash.has(contentHash)) {
    return false;
  }
  inflightByHash.set(contentHash, entry);
  return true;
}

export function unregisterInflightDedupHash(contentHash: string | undefined, jobId: string): void {
  if (!contentHash) {
    return;
  }
  const existing = inflightByHash.get(contentHash);
  if (existing?.jobId === jobId) {
    inflightByHash.delete(contentHash);
  }
}

/** Test-only reset — avoids cross-spec pollution from the module-level map. */
export function clearInflightDedupRegistryForTests(): void {
  inflightByHash.clear();
}
