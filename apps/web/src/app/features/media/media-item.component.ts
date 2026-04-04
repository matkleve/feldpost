import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import type { AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { PhotoLoadState } from '../../core/media-download/media-download.types';
import { I18nService } from '../../core/i18n/i18n.service';
import type { MediaTier, UploadOverlayState } from '../../core/media/media-renderer.types';
import { PhotoLoadService } from '../../core/media-download/media-download.service'; // TODO: Migrate to MediaDownloadService
import { MediaOrchestratorService } from '../../core/media/media-orchestrator.service'; // TODO: Migrate to MediaDownloadService
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import { ItemComponent, type ItemDisplayMode } from '../../shared/item-grid/item.component';
import { ItemStateFrameComponent } from '../../shared/item-grid/item-state-frame.component';
import type { ImageRecord } from '../map/workspace-pane/media-detail-view.types';
import { ACTION_CONTEXT_IDS } from '../action-system/action-context-ids';
import { MediaItemQuietActionsComponent } from './media-item-quiet-actions.component';
import type { MediaItemQuietActionsState } from './media-item-quiet-actions.component';
import {
  MediaItemRenderSurfaceComponent,
  type MediaItemRenderState,
  type MediaItemRenderSurfaceState,
} from './media-item-render-surface.component';
import { MediaItemUploadOverlayComponent } from './media-item-upload-overlay.component';
import { resolveMediaItemUploadOverlay } from './media-item-upload.utils';
import { rectToRemSize, requestedTierForMode } from './media-item-slot.utils';
import type { ChipVariant } from '../../shared/components/chip/chip.component';
import {
  normalizeMediaItemRenderState,
  resolveMediaTypeLabel,
  type LegacyMediaItemRenderState,
} from './media-item.utils';

export const MEDIA_ITEM_ACTION_CONTEXT = ACTION_CONTEXT_IDS.wsGridThumbnail;

@Component({
  selector: 'app-media-item',
  imports: [
    ItemStateFrameComponent,
    MediaItemRenderSurfaceComponent,
    MediaItemUploadOverlayComponent,
    MediaItemQuietActionsComponent,
  ],
  templateUrl: './media-item.component.html',
  styleUrl: './media-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaItemComponent extends ItemComponent implements OnChanges, AfterViewInit {
  private readonly i18nService = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly photoLoadService = inject(PhotoLoadService);
  private readonly uploadManager = inject(UploadManagerService);
  private readonly mediaOrchestrator = inject(MediaOrchestratorService);
  private thumbnailRequestId = 0;
  private resizeObserver: ResizeObserver | null = null;

  readonly item = input<ImageRecord | null>(null);
  readonly thumbnailUrl = signal('');
  readonly slotWidthRem = signal<number | null>(null);
  readonly slotHeightRem = signal<number | null>(null);
  readonly activeMode = computed<ItemDisplayMode>(() => this.mode());
  readonly loadingLabel = computed(() => this.t('common.loading', 'Loading media...'));
  readonly errorLabel = computed(() => this.t('media.page.error', 'Failed to load media'));
  readonly emptyLabel = computed(() => this.t('media.page.empty', 'No media found'));

  readonly fileIdentity = computed(() => {
    const record = this.item();
    const storagePath = record?.storage_path ?? null;
    return { fileName: storagePath, extension: storagePath?.split('.').pop()?.toLowerCase() ?? '' };
  });

  readonly fileType = computed(() => this.mediaOrchestrator.resolveFileType(this.fileIdentity()));
  readonly mediaIcon = computed(() => this.mediaOrchestrator.resolveIcon(this.fileIdentity()));
  readonly canRenderImage = computed(() => this.fileType().category === 'image');
  readonly hasMapLocation = computed(() => {
    const record = this.item();
    return !!record && record.latitude !== null && record.longitude !== null;
  });
  readonly mediaTypeLabel = computed(() =>
    resolveMediaTypeLabel(
      this.fileType(),
      this.mediaOrchestrator.resolveBadge(this.fileIdentity()),
      (key, fallback) => this.t(key, fallback),
    ),
  );
  readonly fileTypeChipVariant = computed<ChipVariant>(() => {
    switch (this.fileType().category) {
      case 'image':
        return 'filetype-image';
      case 'video':
        return 'filetype-video';
      case 'document':
        return 'filetype-document';
      case 'spreadsheet':
        return 'filetype-spreadsheet';
      case 'presentation':
        return 'filetype-presentation';
      default:
        return 'default';
    }
  });
  readonly requestedTier = computed<MediaTier>(() => requestedTierForMode(this.activeMode()));
  readonly effectiveTier = computed<MediaTier>(() =>
    this.mediaOrchestrator.selectRequestedTierForSlot({
      requestedTier: this.requestedTier(),
      slotWidthRem: this.slotWidthRem(),
      slotHeightRem: this.slotHeightRem(),
      context: 'grid',
    }),
  );
  readonly photoLoadState = computed<PhotoLoadState>(() => {
    const record = this.item();
    if (!record || !this.canRenderImage()) return 'idle';
    const preferredPath = record.thumbnail_path ?? record.storage_path;
    if (!preferredPath) return 'no-photo';
    return this.photoLoadService.getLoadState(record.id, 'thumb')();
  });
  readonly legacyMediaRenderState = computed<LegacyMediaItemRenderState>(() => {
    const record = this.item();
    if (!record) return 'placeholder';
    if (!this.canRenderImage()) return 'icon-only';
    if (this.thumbnailUrl().length > 0) return 'loaded';
    switch (this.photoLoadState()) {
      case 'loading':
      case 'loaded':
        return 'loading';
      case 'error':
        return 'error';
      case 'no-photo':
        return 'no-photo';
      case 'idle':
      default:
        return 'placeholder';
    }
  });
  readonly mediaRenderState = computed<MediaItemRenderState>(() =>
    normalizeMediaItemRenderState(this.legacyMediaRenderState()),
  );
  readonly renderSurfaceState = computed<MediaItemRenderSurfaceState>(() => {
    const state = this.mediaRenderState();
    if (state === 'content' && this.selected()) {
      return 'content-selected';
    }
    return state;
  });
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
    this.destroyRef.onDestroy(() => {
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
    });

    this.photoLoadService.urlChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        const record = this.item();
        if (!record || (event.mediaId ?? event.imageId) !== record.id || event.size !== 'thumb') {
          return;
        }
        this.thumbnailUrl.set(event.url ?? '');
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item']) void this.resolveThumbnailUrl(this.item());
  }

  ngAfterViewInit(): void {
    const previewElement = this.hostElement.nativeElement.querySelector(
      '.media-item__preview',
    ) as HTMLElement | null;
    if (!previewElement) return;

    this.updateSlot(previewElement.getBoundingClientRect());
    if (typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      this.updateSlot(entry.contentRect);
    });

    this.resizeObserver.observe(previewElement);
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
    void this.resolveThumbnailUrl(this.item());
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

  private async resolveThumbnailUrl(record: ImageRecord | null): Promise<void> {
    if (!record) {
      this.thumbnailUrl.set('');
      return;
    }
    const preferredPath = record.thumbnail_path ?? record.storage_path;
    if (!preferredPath || !this.isLikelyImagePath(preferredPath)) {
      this.thumbnailUrl.set('');
      if (!preferredPath) this.photoLoadService.markNoPhoto(record.id);
      return;
    }
    if (/^(https?:|blob:|data:)/i.test(preferredPath)) {
      this.thumbnailUrl.set(preferredPath);
      return;
    }
    const requestId = ++this.thumbnailRequestId;
    const signed = await this.photoLoadService.getSignedUrl(preferredPath, 'thumb', record.id);
    if (requestId !== this.thumbnailRequestId) return;
    this.thumbnailUrl.set(signed.url ?? '');
  }

  private isLikelyImagePath(path: string): boolean {
    const extension = path.split('.').pop()?.toLowerCase() ?? '';
    return this.mediaOrchestrator.resolveFileType({ extension }).category === 'image';
  }

  private updateSlot(rect: Pick<DOMRectReadOnly, 'width' | 'height'>): void {
    const remSize = rectToRemSize(rect);
    if (!remSize) return;

    this.slotWidthRem.set(remSize.widthRem);
    this.slotHeightRem.set(remSize.heightRem);
  }
}
