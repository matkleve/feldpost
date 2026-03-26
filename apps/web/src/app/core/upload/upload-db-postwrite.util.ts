type DedupInsertPayload = {
  image_id: string | undefined;
  content_hash: string;
  user_id: string | undefined;
};

type InsertDedupHashArgs = {
  contentHash: string | undefined;
  imageId: string | undefined;
  userId: string | undefined;
  insert: (payload: DedupInsertPayload) => PromiseLike<unknown>;
};

export function insertDedupHashFireAndForget(args: InsertDedupHashArgs): void {
  const { contentHash, imageId, userId, insert } = args;
  if (!contentHash) {
    return;
  }
  insert({
    image_id: imageId,
    content_hash: contentHash,
    user_id: userId,
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
      '[attach-pipeline] ✗ WRITE DID NOT PERSIST — RLS likely blocked the update. Expected:',
      expectedStoragePath,
      'Got:',
      storagePath,
    );
  }
}
