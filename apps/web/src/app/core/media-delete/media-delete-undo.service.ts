import { Injectable, inject } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ToastService } from '../toast/toast.service';
import type {
  MediaDeleteKind,
  MediaDeleteSnapshot,
  MediaDeleteWithUndoOptions,
  MediaDeleteWithUndoResult,
  MediaItemDeleteRow,
} from './media-delete-undo.types';

const DELETE_TOAST_DURATION_MS = 5000;

@Injectable({ providedIn: 'root' })
export class MediaDeleteUndoService {
  private readonly supabase = inject(SupabaseService);
  private readonly toastService = inject(ToastService);
  private readonly i18n = inject(I18nService);

  private readonly t = (key: string, fallback: string): string => this.i18n.t(key, fallback);

  async deleteWithUndo(options: MediaDeleteWithUndoOptions): Promise<MediaDeleteWithUndoResult> {
    const mediaItemIds = this.normalizeIds(options.mediaItemIds);
    if (mediaItemIds.length === 0) {
      return { ok: true, errorMessage: null, snapshot: null };
    }

    const snapshot = await this.captureSnapshot(mediaItemIds);
    if (!snapshot || snapshot.items.length === 0) {
      return { ok: false, errorMessage: 'Media not found.', snapshot: null };
    }

    const deleteIds = snapshot.items.map((row) => row.id);
    const { error } = await this.supabase.client.from('media_items').delete().in('id', deleteIds);

    if (error) {
      return { ok: false, errorMessage: error.message, snapshot: null };
    }

    await options.onAfterDelete?.();
    this.showDeletedToast(snapshot, options.onAfterUndo);
    return { ok: true, errorMessage: null, snapshot };
  }

  showDeletedToast(
    snapshot: MediaDeleteSnapshot,
    onAfterUndo?: () => void | Promise<void>,
  ): void {
    const title = this.buildDeletedMessage(snapshot);
    const undoLabel = this.t('media.delete.toast.undo', 'Undo');

    this.toastService.show({
      title,
      type: 'success',
      duration: DELETE_TOAST_DURATION_MS,
      dedupe: false,
      action: {
        label: undoLabel,
        onClick: () => {
          void this.restoreSnapshot(snapshot, onAfterUndo);
        },
      },
    });
  }

  private async restoreSnapshot(
    snapshot: MediaDeleteSnapshot,
    onAfterUndo?: () => void | Promise<void>,
  ): Promise<void> {
    const restored = await this.restoreFromSnapshot(snapshot);
    if (!restored.ok) {
      this.toastService.show({
        title: this.t('media.delete.toast.restoreFailedTitle', 'Restore failed'),
        body: this.t(
          'media.delete.toast.restoreFailed',
          'Could not restore deleted media. Please refresh.',
        ),
        codeRef: { file: 'media-delete-undo.service.ts', fn: 'restoreSnapshot' },
        type: 'error',
        dedupe: true,
      });
      return;
    }

    await onAfterUndo?.();
  }

  async restoreFromSnapshot(
    snapshot: MediaDeleteSnapshot,
  ): Promise<{ ok: boolean; errorMessage: string | null }> {
    if (snapshot.items.length === 0) {
      return { ok: true, errorMessage: null };
    }

    const { error: itemsError } = await this.supabase.client
      .from('media_items')
      .upsert(snapshot.items, { onConflict: 'id' });

    if (itemsError) {
      return { ok: false, errorMessage: itemsError.message };
    }

    if (snapshot.projectMemberships.length > 0) {
      const { error } = await this.supabase.client
        .from('media_projects')
        .upsert(snapshot.projectMemberships, { onConflict: 'media_item_id,project_id' });
      if (error) {
        return { ok: false, errorMessage: error.message };
      }
    }

    if (snapshot.sectionItems.length > 0) {
      const { error } = await this.supabase.client
        .from('project_section_items')
        .upsert(snapshot.sectionItems, { onConflict: 'section_id,media_item_id' });
      if (error) {
        return { ok: false, errorMessage: error.message };
      }
    }

    if (snapshot.metadataRows.length > 0) {
      const { error } = await this.supabase.client
        .from('media_metadata')
        .upsert(snapshot.metadataRows);
      if (error) {
        return { ok: false, errorMessage: error.message };
      }
    }

    return { ok: true, errorMessage: null };
  }

  private buildDeletedMessage(snapshot: MediaDeleteSnapshot): string {
    const count = snapshot.items.length;
    const kind = this.classifyDeleteKind(snapshot.items);

    if (count === 1) {
      if (kind === 'photo') {
        return this.t('media.delete.toast.photoDeleted', 'Photo deleted');
      }
      if (kind === 'file') {
        return this.t('media.delete.toast.fileDeleted', 'File deleted');
      }
      return this.t('media.delete.toast.mediaDeleted', 'Media deleted');
    }

    const countText = String(count);
    if (kind === 'photo') {
      return this.t('media.delete.toast.photosDeleted', '{count} photos deleted').replace(
        '{count}',
        countText,
      );
    }
    if (kind === 'file') {
      return this.t('media.delete.toast.filesDeleted', '{count} files deleted').replace(
        '{count}',
        countText,
      );
    }
    return this.t('media.delete.toast.mediaItemsDeleted', '{count} media deleted').replace(
      '{count}',
      countText,
    );
  }

  private classifyDeleteKind(items: MediaItemDeleteRow[]): MediaDeleteKind {
    const kinds = new Set(
      items.map((item) => (item.media_type === 'photo' ? 'photo' : 'file')),
    );
    if (kinds.size > 1) {
      return 'mixed';
    }
    return kinds.has('photo') ? 'photo' : 'file';
  }

  private async captureSnapshot(mediaItemIds: string[]): Promise<MediaDeleteSnapshot | null> {
    const idList = mediaItemIds.join(',');
    const { data: items, error: itemsError } = await this.supabase.client
      .from('media_items')
      .select('*')
      .or(`id.in.(${idList}),source_image_id.in.(${idList})`);

    if (itemsError || !Array.isArray(items) || items.length === 0) {
      return null;
    }

    const rows = items as MediaItemDeleteRow[];
    const resolvedIds = rows.map((row) => row.id);

    const [memberships, sectionItems, metadataRows] = await Promise.all([
      this.fetchRelatedRows('media_projects', 'media_item_id', resolvedIds),
      this.fetchRelatedRows('project_section_items', 'media_item_id', resolvedIds),
      this.fetchRelatedRows('media_metadata', 'media_item_id', resolvedIds),
    ]);

    return {
      items: rows,
      projectMemberships: memberships,
      sectionItems,
      metadataRows,
    };
  }

  private async fetchRelatedRows(
    table: 'media_projects' | 'project_section_items' | 'media_metadata',
    column: string,
    mediaItemIds: string[],
  ): Promise<Record<string, unknown>[]> {
    if (mediaItemIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase.client
      .from(table)
      .select('*')
      .in(column, mediaItemIds);

    if (error || !Array.isArray(data)) {
      return [];
    }

    return data as Record<string, unknown>[];
  }

  private normalizeIds(ids: readonly string[]): string[] {
    return Array.from(new Set(ids.filter((id) => typeof id === 'string' && id.length > 0)));
  }
}
