type DedupInsertPayload = {
  media_item_id: string | undefined;
  content_hash: string;
  user_id: string | undefined;
  organization_id: string | undefined;
  hash_algo: string | undefined;
};

type InsertDedupHashArgs = {
  contentHash: string | undefined;
  mediaItemId: string | undefined;
  userId: string | undefined;
  organizationId: string | undefined;
  hashAlgo: string | undefined;
  insert: (payload: DedupInsertPayload) => PromiseLike<unknown>;
  /** @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-35 */
  onError?: (error: unknown) => void;
};

/** First path segment of `{org_id}/{user_id}/{uuid}.ext` storage paths. */
export function organizationIdFromStoragePath(storagePath: string | undefined): string | undefined {
  if (!storagePath) {
    return undefined;
  }
  const [orgId] = storagePath.split('/');
  return orgId || undefined;
}

export function insertDedupHashFireAndForget(args: InsertDedupHashArgs): void {
  const { contentHash, mediaItemId, userId, organizationId, hashAlgo, insert, onError } = args;
  if (!contentHash || !organizationId) {
    return;
  }
  insert({
    media_item_id: mediaItemId,
    content_hash: contentHash,
    user_id: userId,
    organization_id: organizationId,
    hash_algo: hashAlgo ?? 'photo_v1',
  }).then(undefined, (error: unknown) => {
    // A lost dedup hash silently defeats resume-safety (re-uploading the same
    // file goes undetected next time); at minimum, surface it instead of
    // leaving an unhandled rejection.
    // @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-35
    if (onError) {
      onError(error);
    } else {
      console.error('[upload] dedup hash insert failed:', error);
    }
  });
}

type RetireStaleDedupHashesArgs = {
  mediaItemId: string;
  keepContentHash: string | undefined;
  rpc: (
    fn: 'retire_dedup_hashes_for_media_item',
    args: { p_media_item_id: string; p_keep_content_hash: string | null },
  ) => PromiseLike<{ data: number | null; error: unknown }>;
  onError?: (error: unknown) => void;
};

/**
 * Retires content-hash rows superseded by a replace (bytes changed, row kept).
 * @see docs/audits/upload-flow-review-2026-09-10/02-new-issues.md NF-01
 */
export function retireStaleDedupHashesFireAndForget(args: RetireStaleDedupHashesArgs): void {
  const { mediaItemId, keepContentHash, rpc, onError } = args;
  if (!keepContentHash) {
    return;
  }
  rpc('retire_dedup_hashes_for_media_item', {
    p_media_item_id: mediaItemId,
    p_keep_content_hash: keepContentHash,
  }).then(
    ({ error }) => {
      if (error) {
        if (onError) {
          onError(error);
        } else {
          console.error('[upload] dedup hash retire failed:', error);
        }
      }
    },
    (error: unknown) => {
      if (onError) {
        onError(error);
      } else {
        console.error('[upload] dedup hash retire failed:', error);
      }
    },
  );
}

type VerifyStoragePathWriteArgs = {
  expectedStoragePath: string;
  readBack: () => Promise<{ storagePath: string | null | undefined; error: unknown }>;
  logInfo: (...args: unknown[]) => void;
  logError: (...args: unknown[]) => void;
};

/**
 * @returns `persisted: false` when the read-back proves the write was blocked
 *   (RLS silently no-opped the update) — callers must treat that as a failure
 *   rather than completing the job.
 * @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-15
 */
export async function verifyStoragePathWrite(
  args: VerifyStoragePathWriteArgs,
): Promise<{ persisted: boolean }> {
  const { expectedStoragePath, readBack, logInfo, logError } = args;
  const { storagePath, error } = await readBack();
  logInfo('[attach-pipeline] verification read-back:', {
    verifyRow: { storage_path: storagePath },
    verifyError: error,
  });
  if (storagePath && storagePath !== expectedStoragePath) {
    logError(
      '[attach-pipeline] ✗ WRITE DID NOT PERSIST — RLS likely blocked the update. Expected:',
      expectedStoragePath,
      'Got:',
      storagePath,
    );
    return { persisted: false };
  }
  return { persisted: true };
}
