import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { OnChanges, SimpleChanges } from '@angular/core';
import type { ImageRecord } from '../map/workspace-pane/media-detail-view.types';
import { I18nService } from '../../core/i18n/i18n.service';
import { PhotoLoadService } from '../../core/photo-load.service';
import { MediaOrchestratorService } from '../../core/media/media-orchestrator.service';
import { ACTION_CONTEXT_IDS } from '../action-system/action-context-ids';
import { ItemComponent, type ItemDisplayMode } from '../../shared/item-grid/item.component';
import { ItemStateFrameComponent } from '../../shared/item-grid/item-state-frame.component';

export const MEDIA_ITEM_ACTION_CONTEXT = ACTION_CONTEXT_IDS.wsGridThumbnail;

export const MEDIA_ITEM_ACTION_IDS: readonly string[] = [
  'open_in_media',
  'zoom_house',
  'zoom_street',
  'copy_address',
  'copy_gps',
  'open_google_maps',
  'assign_to_project',
  'change_location_map',
  'change_location_address',
  'remove_from_project',
  'delete_media',
  'download',
  'share_link',
  'copy_link',
  'native_share',
];

@Component({
  selector: 'app-media-item',
  imports: [ItemStateFrameComponent],
  templateUrl: './media-item.component.html',
  styleUrl: './media-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaItemComponent extends ItemComponent implements OnChanges {
  private readonly i18nService = inject(I18nService);
  private readonly photoLoadService = inject(PhotoLoadService);
  private readonly mediaOrchestrator = inject(MediaOrchestratorService);
  private thumbnailRequestId = 0;

  readonly item = input<ImageRecord | null>(null);
  readonly projectName = input<string>('');

  readonly thumbnailUrl = signal('');
  readonly thumbnailFailed = signal(false);
  readonly thumbnailLoading = signal(false);

  readonly hasItem = computed(() => !!this.item());

  readonly activeMode = computed<ItemDisplayMode>(() => this.mode());

  readonly loadingLabel = computed(() => this.t('common.loading', 'Loading media...'));

  readonly errorLabel = computed(() => this.t('media.page.error', 'Failed to load media'));

  readonly emptyLabel = computed(() => this.t('media.page.empty', 'No media found'));

  // Resolves default action context for media items from the canonical matrix contract.
  // @see docs/element-specs/action-context-matrix.md#canonical-context-definitions
  readonly mediaActionContextId = computed(
    () => this.actionContextId() ?? MEDIA_ITEM_ACTION_CONTEXT,
  );

  readonly fileIdentity = computed(() => {
    const record = this.item();
    const storagePath = record?.storage_path ?? null;
    const extension = storagePath?.split('.').pop()?.toLowerCase() ?? '';

    return {
      fileName: storagePath,
      extension,
    };
  });

  readonly fileType = computed(() => this.mediaOrchestrator.resolveFileType(this.fileIdentity()));

  readonly mediaIcon = computed(() => this.mediaOrchestrator.resolveIcon(this.fileIdentity()));

  readonly canRenderImage = computed(() => this.fileType().category === 'image');

  readonly resolvedLoading = computed(
    () => this.loading() || (this.canRenderImage() && this.thumbnailLoading()),
  );

  readonly showThumbnailImage = computed(
    () => this.thumbnailUrl().length > 0 && !this.thumbnailFailed() && this.canRenderImage(),
  );

  readonly titleText = computed(() => {
    const record = this.item();
    if (!record) {
      return this.t('media.page.title', 'Media');
    }

    return record.address_label || this.t('media.page.title', 'Media');
  });

  readonly subtitleText = computed(() => {
    const project = this.projectName();
    const type = this.mediaTypeLabel();

    if (project.length > 0 && type.length > 0) {
      return `${project} · ${type}`;
    }

    if (project.length > 0) {
      return project;
    }

    return type;
  });

  readonly capturedAtText = computed(() => {
    const record = this.item();
    if (!record) {
      return '';
    }

    return this.formatDate(record.captured_at, record.has_time);
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item']) {
      void this.resolveThumbnailUrl(this.item());
    }
  }

  t(key: string, fallback: string): string {
    const value = this.i18nService.t(key, fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  }

  onOpenClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.disabled()) {
      return;
    }

    this.emitOpened();
  }

  onSelectClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.disabled()) {
      return;
    }

    this.emitSelectedChange(!this.selected());
  }

  onRetryRequested(itemId: string): void {
    if (itemId !== this.itemId()) {
      return;
    }

    void this.resolveThumbnailUrl(this.item());
    this.emitRetryRequested();
  }

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.disabled()) {
      return;
    }

    this.emitContextAction('open_in_media');
  }

  private mediaTypeLabel(): string {
    const definition = this.fileType();
    const badge = this.mediaOrchestrator.resolveBadge(this.fileIdentity());

    switch (definition.category) {
      case 'image':
        return this.t('media.meta.type.image', 'Image');
      case 'video':
        return this.t('media.meta.type.video', 'Video');
      case 'document':
        return definition.id === 'pdf' ? this.t('media.meta.type.pdf', 'PDF') : definition.label;
      case 'spreadsheet':
      case 'presentation':
      case 'audio':
        return definition.label;
      default:
        return badge ?? definition.label;
    }
  }

  private formatDate(dateString: string | null, includeTime = false): string {
    if (!dateString) {
      return '';
    }

    try {
      const locale = this.i18nService.locale();
      const options: Intl.DateTimeFormatOptions = includeTime
        ? { dateStyle: 'medium', timeStyle: 'short' }
        : { dateStyle: 'medium' };
      return new Intl.DateTimeFormat(locale, options).format(new Date(dateString));
    } catch {
      return '';
    }
  }

  private async resolveThumbnailUrl(record: ImageRecord | null): Promise<void> {
    const preferredPath = record?.thumbnail_path ?? record?.storage_path;

    if (!preferredPath || !this.isLikelyImagePath(preferredPath)) {
      this.thumbnailFailed.set(false);
      this.thumbnailLoading.set(false);
      this.thumbnailUrl.set('');
      return;
    }

    if (/^(https?:|blob:|data:)/i.test(preferredPath)) {
      this.thumbnailFailed.set(false);
      this.thumbnailLoading.set(false);
      this.thumbnailUrl.set(preferredPath);
      return;
    }

    const requestId = ++this.thumbnailRequestId;
    this.thumbnailLoading.set(true);

    const signed = await this.photoLoadService.getSignedUrl(preferredPath, 'thumb', record?.id);
    if (requestId !== this.thumbnailRequestId) {
      return;
    }

    this.thumbnailFailed.set(!signed.url);
    this.thumbnailUrl.set(signed.url ?? '');
    this.thumbnailLoading.set(false);
  }

  private isLikelyImagePath(path: string): boolean {
    const extension = path.split('.').pop()?.toLowerCase() ?? '';
    return this.mediaOrchestrator.resolveFileType({ extension }).category === 'image';
  }
}
