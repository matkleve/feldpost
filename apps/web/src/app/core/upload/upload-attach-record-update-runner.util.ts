import { performAttachRecordUpdate } from './upload-attach-record-update.util';
import type { SupabaseService } from '../supabase/supabase.service';
import type { UploadJob } from './upload-manager.types';
import type { ParsedExif } from './upload.service';

type RunAttachRecordUpdateArgs = {
  jobId: string;
  job: UploadJob;
  parsedExif: ParsedExif;
  contentHash: string;
  storagePath: string;
  userId: string | undefined;
  supabaseClient: SupabaseService['client'];
  setPhase: (phase: 'replacing_record') => void;
  failJob: (phase: 'replacing_record', error: string) => void;
  onCancelled: () => Promise<boolean>;
  logInfo: (...args: unknown[]) => void;
  logError: (...args: unknown[]) => void;
};

export async function runAttachRecordUpdate(
  args: RunAttachRecordUpdateArgs,
): ReturnType<typeof performAttachRecordUpdate> {
  const {
    job,
    parsedExif,
    contentHash,
    storagePath,
    userId,
    supabaseClient,
    setPhase,
    failJob,
    onCancelled,
    logInfo,
    logError,
  } = args;

  const { data: targetRow, error: targetResolveError } = await supabaseClient
    .from('media_items')
    .select('id')
    .or(`id.eq.${job.targetImageId!},source_image_id.eq.${job.targetImageId!}`)
    .limit(1)
    .maybeSingle();

  if (targetResolveError || !targetRow?.id) {
    failJob('replacing_record', 'Could not resolve target image row.');
    return null;
  }

  const targetMediaItemId = targetRow.id;

  setPhase('replacing_record');
  return performAttachRecordUpdate({
    storagePath,
    targetImageId: targetMediaItemId,
    parsedExif,
    conflictResolution: job.conflictResolution,
    contentHash,
    userId,
    fetchExistingRow: async () => {
      const { data, error } = await supabaseClient
        .from('media_items')
        .select('latitude, longitude')
        .eq('id', targetMediaItemId)
        .limit(1)
        .maybeSingle();
      return { data, error };
    },
    updateImageRow: async (updateData) => {
      const { error } = await supabaseClient
        .from('media_items')
        .update(updateData)
        .eq('id', targetMediaItemId);
      return { error };
    },
    readBackStoragePath: async () => {
      const { data, error } = await supabaseClient
        .from('media_items')
        .select('storage_path')
        .eq('id', targetMediaItemId)
        .limit(1)
        .maybeSingle();
      return { storagePath: data?.storage_path, error };
    },
    removeStoragePath: async (path) => {
      await supabaseClient.storage.from('media').remove([path]);
    },
    onFail: (_phase, error) => failJob('replacing_record', error),
    onCancelled,
    insertDedupHash: async (payload) => {
      await supabaseClient.from('dedup_hashes').insert(payload);
    },
    logInfo: (...logArgs) => logInfo(...logArgs),
    logError: (...logArgs) => logError(...logArgs),
  });
}
