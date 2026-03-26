import { fetchAttachExistingRow } from './upload-attach-existing-row.util';
import { buildAttachUpdateData } from './upload-attach-update-data.util';
import { insertDedupHashFireAndForget, verifyStoragePathWrite } from './upload-db-postwrite.util';
import type { ConflictResolution, UploadPhase } from './upload-manager.types';
import type { ExifCoords, ParsedExif } from './upload.service';

type ExistingRow = {
  latitude: number | null;
  longitude: number | null;
};

type AttachRecordUpdateResult = {
  hadExistingCoords: boolean;
  isAttachKeep: boolean;
  finalCoords: ExifCoords | undefined;
};

type AttachRecordUpdateArgs = {
  storagePath: string;
  targetImageId: string;
  parsedExif: ParsedExif;
  conflictResolution: ConflictResolution | undefined;
  contentHash: string | undefined;
  userId: string | undefined;
  fetchExistingRow: () => Promise<{ data: ExistingRow | null; error: unknown }>;
  updateImageRow: (
    updateData: Record<string, unknown>,
  ) => Promise<{ error: { message: string } | null }>;
  readBackStoragePath: () => Promise<{ storagePath: string | undefined; error: unknown }>;
  removeStoragePath: (path: string) => Promise<unknown>;
  onFail: (phase: UploadPhase, error: string) => void;
  onCancelled: () => Promise<boolean>;
  insertDedupHash: (payload: {
    content_hash: string;
    image_id: string;
    owner_id?: string;
  }) => Promise<unknown>;
  logInfo: (...args: unknown[]) => void;
  logError: (...args: unknown[]) => void;
};

export async function performAttachRecordUpdate(
  args: AttachRecordUpdateArgs,
): Promise<AttachRecordUpdateResult | null> {
  const existing = await fetchAttachExistingRow({
    fetchRow: args.fetchExistingRow,
    onFetchError: async (error) => {
      args.logError('[attach-pipeline] failed to fetch existing row:', error);
      await args.removeStoragePath(args.storagePath);
      args.onFail('replacing_record', 'Could not read existing image row.');
    },
  });
  if (!existing) {
    return null;
  }

  const { existingRow, hadExistingCoords } = existing;
  const { updateData, isAttachKeep } = buildAttachUpdateData({
    storagePath: args.storagePath,
    parsedExif: args.parsedExif,
    hadExistingCoords,
    conflictResolution: args.conflictResolution,
  });

  const { error: updateError } = await args.updateImageRow(updateData);
  if (await args.onCancelled()) {
    return null;
  }
  if (updateError) {
    args.logError('[attach-pipeline] DB update failed:', updateError);
    await args.removeStoragePath(args.storagePath);
    args.onFail('replacing_record', updateError.message);
    return null;
  }

  await verifyStoragePathWrite({
    expectedStoragePath: args.storagePath,
    readBack: args.readBackStoragePath,
    logInfo: args.logInfo,
    logError: args.logError,
  });

  insertDedupHashFireAndForget({
    contentHash: args.contentHash,
    imageId: args.targetImageId,
    userId: args.userId,
    insert: args.insertDedupHash,
  });

  const finalCoords =
    args.parsedExif.coords ??
    (hadExistingCoords ? { lat: existingRow.latitude!, lng: existingRow.longitude! } : undefined);

  args.logInfo('[attach-pipeline] DB row updated successfully');

  return {
    hadExistingCoords,
    isAttachKeep,
    finalCoords,
  };
}
