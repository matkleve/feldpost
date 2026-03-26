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

  setPhase('replacing_record');
  return performAttachRecordUpdate({
    storagePath,
    targetImageId: job.targetImageId!,
    parsedExif,
    conflictResolution: job.conflictResolution,
    contentHash,
    userId,
    fetchExistingRow: async () => {
      const { data, error } = await supabaseClient
        .from('images')
        .select('latitude, longitude')
        .eq('id', job.targetImageId!)
        .single();
      return { data, error };
    },
    updateImageRow: async (updateData) => {
      const { error } = await supabaseClient
        .from('images')
        .update(updateData)
        .eq('id', job.targetImageId!);
      return { error };
    },
    readBackStoragePath: async () => {
      const { data, error } = await supabaseClient
        .from('images')
        .select('storage_path')
        .eq('id', job.targetImageId!)
        .single();
      return { storagePath: data?.storage_path, error };
    },
    removeStoragePath: async (path) => {
      await supabaseClient.storage.from('images').remove([path]);
    },
    onFail: (phase, error) => failJob(phase, error),
    onCancelled,
    insertDedupHash: (payload) => supabaseClient.from('dedup_hashes').insert(payload),
    logInfo: (...logArgs) => logInfo(...logArgs),
    logError: (...logArgs) => logError(...logArgs),
  });
}
