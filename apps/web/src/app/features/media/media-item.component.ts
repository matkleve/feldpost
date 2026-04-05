import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { OnChanges, SimpleChanges } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import type { UploadOverlayState } from '../../core/media/media-renderer.types';
import { MediaDownloadService } from '../../core/media-download/media-download.service';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import { ItemComponent, type ItemDisplayMode } from '../../shared/item-grid/item.component';
import { ItemStateFrameComponent } from '../../shared/item-grid/item-state-frame.component';
import type { ImageRecord } from '../map/workspace-pane/media-detail-view.types';
import { ACTION_CONTEXT_IDS } from '../action-system/action-context-ids';
import { MediaItemQuietActionsComponent } from './media-item-quiet-actions.component';
import type { MediaItemQuietActionsState } from './media-item-quiet-actions.component';
import { MediaItemUploadOverlayComponent } from './media-item-upload-overlay.component';
import { resolveMediaItemUploadOverlay } from './media-item-upload.utils';
import { MediaDisplayComponent } from '../../shared/media-display/media-display.component';

export const MEDIA_ITEM_ACTION_CONTEXT = ACTION_CONTEXT_IDS.wsGridThumbnail;

const GRID_SM_MAX_EDGE_REM = 8;
const GRID_MD_MAX_EDGE_REM = 10;
const GRID_LG_MAX_EDGE_REM = 13;
const ROW_MAX_EDGE_REM = 10;
const CARD_MAX_EDGE_REM = 14;

@Component({
  selector: 'app-media-item',
  imports: [
    ItemStateFrameComponent,
    MediaDisplayComponent,
    MediaItemUploadOverlayComponent,
    MediaItemQuietActionsComponent,
  ],
  templateUrl: './media-item.component.html',
  styleUrl: './media-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaItemComponent extends ItemComponent implements OnChanges {
  private readonly i18nService = inject(I18nService);
  private readonly mediaDownloadService = inject(MediaDownloadService);
  private readonly uploadManager = inject(UploadManagerService);

  readonly item = input<ImageRecord | null>(null);
  readonly activeMode = computed<ItemDisplayMode>(() => this.mode());
  readonly loadingLabel = computed(() => this.t('common.loading', 'Loading media...'));
  readonly errorLabel = computed(() => this.t('media.page.error', 'Failed to load media'));
  readonly emptyLabel = computed(() => this.t('media.page.empty', 'No media found'));

  readonly fileIdentity = computed(() => {
    const record = this.item();
    const storagePath = record?.storage_path ?? null;
    return { fileName: storagePath, extension: storagePath?.split('.').pop()?.toLowerCase() ?? '' };
  });

  readonly fileType = computed(() =>
    this.mediaDownloadService.resolveFileType(this.fileIdentity()),
  );
  readonly canRenderImage = computed(() => this.fileType().category === 'image');
  readonly hasMapLocation = computed(() => {
    const record = this.item();
    return !!record && record.latitude !== null && record.longitude !== null;
  });
  readonly mediaIdentity = computed(() => this.item()?.id ?? this.itemId());
  readonly mediaDisplayMaxEdgeRem = computed(() => this.resolveModeMaxEdge(this.activeMode()));
  readonly mediaDisplayMaxWidth = computed(() => `${this.mediaDisplayMaxEdgeRem()}rem`);
  readonly mediaDisplayMaxHeight = computed(() => `${this.mediaDisplayMaxEdgeRem()}rem`);
  readonly mediaDisplayAspectRatio = computed<number | null>(() => null);

  readonly quietActionsState = computed<MediaItemQuietActionsState>(() => {
    if (this.disabled()) {
      return 'disabled';
    }
    const selected = this.selected();
    const hasMapLocation = this.hasMapLocation();
    if (selected && !hasMapLocation) {
      return 'interactive-selected-map-disabled';
    }
    if (selected) {
      return 'interactive-selected';
    }
    if (!hasMapLocation) {
      return 'interactive-map-disabled';
    }
    return 'interactive-unselected';
  });
  readonly uploadOverlay = computed<UploadOverlayState | null>(() =>
    resolveMediaItemUploadOverlay(this.uploadManager.jobs(), this.item()),
  );

  readonly titleText = computed(
    () => this.item()?.address_label || this.t('media.page.title', 'Media'),
  );

  constructor() {
    super();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item']) {
      void this.prefetchMedia(this.item());
    }
  }

  t(key: string, fallback: string): string {
    const value = this.i18nService.t(key, fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  }

  onOpenClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) return;
    this.emitOpened();
  }

  onSelectRequested(): void {
    if (this.disabled()) return;
    this.emitSelectedChange(!this.selected());
  }

  onRetryRequested(itemId: string): void {
    if (itemId !== this.itemId()) return;
    void this.prefetchMedia(this.item());
    this.emitRetryRequested();
  }

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) return;
    this.emitContextAction('open_in_media');
  }

  onMapActionRequested(): void {
    if (this.disabled() || !this.hasMapLocation()) return;
    this.emitContextAction('zoom_house');
  }

  private async prefetchMedia(record: ImageRecord | null): Promise<void> {
    if (!record) {
      return;
    }

    const preferredPath = record.thumbnail_path ?? record.storage_path;
    if (!preferredPath || !this.isLikelyImagePath(preferredPath)) {
      if (!preferredPath) {
        this.mediaDownloadService.markNoMedia(record.id);
      }
      return;
    }

    if (/^(https?:|blob:|data:)/i.test(preferredPath)) {
      this.mediaDownloadService.setLocalUrl(record.id, preferredPath);
      return;
    }

    await this.mediaDownloadService.getSignedUrl(preferredPath, 'thumb', record.id);
  }

  private isLikelyImagePath(path: string): boolean {
    const extension = path.split('.').pop()?.toLowerCase() ?? '';
    return this.mediaDownloadService.resolveFileType({ extension }).category === 'image';
  }

  private resolveModeMaxEdge(mode: ItemDisplayMode): number {
    switch (mode) {
      case 'grid-sm':
        return GRID_SM_MAX_EDGE_REM;
      case 'grid-lg':
        return GRID_LG_MAX_EDGE_REM;
      case 'card':
        return CARD_MAX_EDGE_REM;
      case 'row':
        return ROW_MAX_EDGE_REM;
      case 'grid-md':
      default:
        return GRID_MD_MAX_EDGE_REM;
    }
  }
}
