import { locationDisplaySnapshotFromRows } from '../../../media-locations/media-locations.helpers';
import type { MediaItemLocationRow } from '../../../media-locations/media-locations.types';
import { performAttachRecordUpdate } from './upload-attach-record-update.util';
import type { SupabaseService } from '../../../supabase/supabase.service';
import type { UploadJob } from '../../upload-manager.types';
import type { ParsedExif } from '../../upload.service';

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
    .or(`id.eq.${job.targetMediaId!},source_image_id.eq.${job.targetMediaId!}`)
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
    originalFilename: job.file.name,
    targetMediaId: targetMediaItemId,
    parsedExif,
    conflictResolution: job.conflictResolution,
    contentHash,
    userId,
    fetchExistingRow: async () => {
      const { data: countData, error: countError } = await supabaseClient.rpc(
        'count_zoomable_locations_for_media',
        { p_media_item_id: targetMediaItemId },
      );
      if (countError) {
        return { data: null, error: countError };
      }

      const hasZoomableLocation = typeof countData === 'number' && countData > 0;
      let latitude: number | null = null;
      let longitude: number | null = null;

      if (hasZoomableLocation) {
        const { data: rows, error: listError } = await supabaseClient.rpc('list_locations_for_media', {
          p_media_item_id: targetMediaItemId,
          p_limit: 50,
          p_offset: 0,
        });
        if (listError) {
          return { data: null, error: listError };
        }
        const snapshot = locationDisplaySnapshotFromRows((rows ?? []) as MediaItemLocationRow[]);
        latitude = snapshot?.fields.latitude ?? null;
        longitude = snapshot?.fields.longitude ?? null;
      }

      return {
        data: { hasZoomableLocation, latitude, longitude },
        error: null,
      };
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
