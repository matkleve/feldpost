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
  const { contentHash, mediaItemId, userId, organizationId, hashAlgo, insert } = args;
  if (!contentHash || !organizationId) {
    return;
  }
  insert({
    media_item_id: mediaItemId,
    content_hash: contentHash,
    user_id: userId,
    organization_id: organizationId,
    hash_algo: hashAlgo ?? 'photo_v1',
  }).then();
}

type VerifyStoragePathWriteArgs = {
  expectedStoragePath: string;
  readBack: () => Promise<{ storagePath: string | null | undefined; error: unknown }>;
  logInfo: (...args: unknown[]) => void;
  logError: (...args: unknown[]) => void;
};

export async function verifyStoragePathWrite(args: VerifyStoragePathWriteArgs): Promise<void> {
  const { expectedStoragePath, readBack, logInfo, logError } = args;
  const { storagePath, error } = await readBack();
  logInfo('[attach-pipeline] verification read-back:', {
    verifyRow: { storage_path: storagePath },
    verifyError: error,
  });
  if (storagePath && storagePath !== expectedStoragePath) {
    logError(
      '[attach-pipeline] x WRITE DID NOT PERSIST -- RLS likely blocked the update. Expected:',
      expectedStoragePath,
      'Got:',
      storagePath,
    );
  }
}
