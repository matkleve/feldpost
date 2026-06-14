import { Component, computed, inject, output, signal, viewChild } from '@angular/core';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HLM_BUTTON_IMPORTS } from '../ui/button';
import { HLM_DIALOG_IMPORTS } from '../ui/dialog';
import { HLM_INPUT_IMPORTS } from '../ui/input';
import { I18nService } from '../../core/i18n/i18n.service';
import { MediaQueryService } from '../../core/media-query/media-query.service';
import { SupabaseService } from '../../core/supabase/supabase.service';
import type { WorkspaceMedia } from '../../core/workspace-view/workspace-view.types';

@Component({
  selector: 'app-media-picker-dialog',
  standalone: true,
  imports: [...BrnDialogImports, ...HLM_DIALOG_IMPORTS, ...HLM_BUTTON_IMPORTS, ...HLM_INPUT_IMPORTS],
  templateUrl: './media-picker-dialog.component.html',
  styleUrl: './media-picker-dialog.component.scss',
})
export class MediaPickerDialogComponent {
  private readonly _brnDialog = viewChild(BrnDialog);
  private readonly i18nService = inject(I18nService);
  private readonly mediaQueryService = inject(MediaQueryService);
  private readonly supabase = inject(SupabaseService);

  readonly confirmed = output<string[]>();
  readonly cancelled = output<void>();

  readonly loading = signal(true);
  readonly allItems = signal<WorkspaceMedia[]>([]);
  readonly searchQuery = signal('');
  readonly selectedIds = signal<Set<string>>(new Set());

  readonly filteredItems = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const items = this.allItems();
    if (!query) return items;
    return items.filter(
      (item) =>
        (item.addressLabel?.toLowerCase().includes(query) ?? false) ||
        (item.city?.toLowerCase().includes(query) ?? false) ||
        (item.street?.toLowerCase().includes(query) ?? false) ||
        (item.fileMetadata?.originalFilename?.toLowerCase().includes(query) ?? false) ||
        (item.fileMetadata?.filename?.toLowerCase().includes(query) ?? false),
    );
  });

  readonly selectionCount = computed(() => this.selectedIds().size);

  readonly t = (key: string, fallback = '') => {
    const value = this.i18nService.t(key, fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  };

  constructor() {
    void this.loadMedia();
  }

  private async loadMedia(): Promise<void> {
    try {
      const items = await this.mediaQueryService.loadAllCurrentUserWorkspaceMedia();
      this.allItems.set(items);
    } finally {
      this.loading.set(false);
    }
  }

  thumbnailUrl(item: WorkspaceMedia): string {
    if (item.signedThumbnailUrl) return item.signedThumbnailUrl;
    const path = item.thumbnailPath ?? item.storagePath;
    if (!path) return '';
    const { data } = this.supabase.client.storage.from('media').getPublicUrl(path, {
      transform: { width: 200, height: 200, resize: 'cover' },
    });
    return data?.publicUrl ?? '';
  }

  toggleSelection(itemId: string): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  isSelected(itemId: string): boolean {
    return this.selectedIds().has(itemId);
  }

  onConfirm(): void {
    this.confirmed.emit([...this.selectedIds()]);
    this._brnDialog()?.close();
  }

  onCancel(): void {
    this.cancelled.emit();
    this._brnDialog()?.close();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }
}
