import type { SupabaseClient } from '@supabase/supabase-js';

export type UploadCancelResidueResult = {
  storageRemoved: boolean;
  rowRemoved: boolean;
  errors: string[];
};

/**
 * Removes whatever a cancelled or signed-out-of job already persisted:
 * the storage object when bytes were written, and the `media_items` row
 * when the DB insert already completed. Either may be absent depending
 * on which phase the job was cancelled in.
 *
 * @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-04
 *   — three cancellation paths previously removed the object but kept
 *   the row, leaving a `media_items` row with a dangling `storage_path`.
 * @see docs/audits/upload-flow-review-2026-09-10/02-new-issues.md NF-03
 */
export async function removeUploadCancelResidue(
  storagePath: string | undefined,
  mediaId: string | undefined,
  // Narrowed to what this function actually calls (`storage.from(...).remove(...)`,
  // `from(...).delete()...`) rather than `Pick<SupabaseClient, 'storage' | 'from'>`,
  // which requires a full StorageClient (19 methods) just to satisfy the type —
  // and so forces every test mock to stub 19 unused methods too.
  supabaseClient: {
    storage: Pick<SupabaseClient['storage'], 'from'>;
    from: SupabaseClient['from'];
  },
): Promise<UploadCancelResidueResult> {
  const errors: string[] = [];
  let storageRemoved = false;
  let rowRemoved = false;

  if (storagePath) {
    const { error } = await supabaseClient.storage.from('media').remove([storagePath]);
    if (error) {
      errors.push(`storage remove failed for ${storagePath}: ${error.message}`);
    } else {
      storageRemoved = true;
    }
  }

  if (mediaId) {
    const { error } = await supabaseClient
      .from('media_items')
      .delete()
      .or(`id.eq.${mediaId},source_image_id.eq.${mediaId}`);
    if (error) {
      errors.push(`media_items delete failed for ${mediaId}: ${error.message}`);
    } else {
      rowRemoved = true;
    }
  }

  if (errors.length > 0) {
    console.error('[upload] cancel residue cleanup failed:', errors);
  }

  return { storageRemoved, rowRemoved, errors };
}
