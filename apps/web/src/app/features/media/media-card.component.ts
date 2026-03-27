import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../core/i18n/i18n.service';
import { PhotoLoadService } from '../../core/photo-load.service';
import { MediaOrchestratorService } from '../../core/media/media-orchestrator.service';
import type { ImageRecord } from '../map/workspace-pane/media-detail-view.types';
import type { CardVariant } from '../../shared/ui-primitives/card-variant.types';
import type { MediaRenderState } from '../../core/media/media-renderer.types';
import { UniversalMediaComponent } from '../../shared/media/universal-media.component';

@Component({
  selector: 'app-media-card',
  standalone: true,
  imports: [CommonModule, UniversalMediaComponent],
  templateUrl: './media-card.component.html',
  styleUrl: './media-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaCardComponent implements OnChanges {
  private readonly i18nService = inject(I18nService);
  private readonly photoLoadService = inject(PhotoLoadService);
  private readonly mediaOrchestrator = inject(MediaOrchestratorService);
  private thumbnailRequestId = 0;

  readonly item = input.required<ImageRecord>();
  readonly variant = input<CardVariant>('medium');
  readonly projectName = input<string>('');
  readonly thumbnailUrl = signal('');
  readonly thumbnailFailed = signal(false);

  readonly select = output<void>();
  readonly open = output<void>();
  readonly locate = output<void>();

  readonly t = (key: string, fallback = ''): string => {
    const value = this.i18nService.t(key, fallback);
    if (typeof value === 'string' && value.trim().length > 0) return value;
    if (fallback.trim().length > 0) return fallback;
    return key;
  };

  // Media renderer state
  readonly fileIdentity = computed(() => {
    const item = this.item();
    const storagePath = item.storage_path;
    const extension = storagePath?.split('.').pop()?.toLowerCase() ?? '';
    return {
      fileName: storagePath,
      extension,
    };
  });

  readonly fileType = computed(() => this.mediaOrchestrator.resolveFileType(this.fileIdentity()));

  readonly mediaRenderState = computed((): MediaRenderState => {
    if (this.thumbnailUrl().length > 0 && !this.thumbnailFailed()) {
      return {
        status: 'loaded',
        url: this.thumbnailUrl(),
        resolvedTier: 'small',
      };
    } else if (this.thumbnailFailed()) {
      return {
        status: 'icon-only',
      };
    } else {
      return {
        status: 'placeholder',
      };
    }
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item']) {
      void this.resolveThumbnailUrl(this.item());
    }
  }

  get formattedCapturedAt(): string {
    return this.formatDate(this.item().captured_at, this.item().has_time);
  }

  get mediaTypeLabel(): string {
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

  get hasLocation(): boolean {
    return this.item().latitude !== null && this.item().longitude !== null;
  }

  formatDate(dateString: string | null, includeTime = false): string {
    if (!dateString) return '';
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

  onSelect(event: Event): void {
    event.stopPropagation();
    this.select.emit();
  }

  onOpen(event: Event): void {
    event.stopPropagation();
    this.open.emit();
  }

  onLocate(event: Event): void {
    event.stopPropagation();
    this.locate.emit();
  }

  onThumbnailError(): void {
    this.thumbnailFailed.set(true);
  }

  private async resolveThumbnailUrl(item: ImageRecord): Promise<void> {
    const preferredPath = item.thumbnail_path ?? item.storage_path;
    if (!preferredPath) {
      this.thumbnailFailed.set(false);
      this.thumbnailUrl.set('');
      return;
    }

    if (!this.isLikelyImagePath(preferredPath)) {
      this.thumbnailFailed.set(false);
      this.thumbnailUrl.set('');
      return;
    }

    if (/^(https?:|blob:|data:)/i.test(preferredPath)) {
      this.thumbnailFailed.set(false);
      this.thumbnailUrl.set(preferredPath);
      return;
    }

    const requestId = ++this.thumbnailRequestId;
    const signed = await this.photoLoadService.getSignedUrl(preferredPath, 'thumb', item.id);
    if (requestId !== this.thumbnailRequestId) {
      return;
    }

    this.thumbnailFailed.set(false);
    this.thumbnailUrl.set(signed.url ?? '');
  }

  private fileExtension(): string {
    const storagePath = this.item().storage_path;
    if (!storagePath) {
      return '';
    }

    return storagePath.split('.').pop()?.toLowerCase() ?? '';
  }

  private isLikelyImagePath(path: string): boolean {
    const extension = path.split('.').pop()?.toLowerCase() ?? '';
    return this.mediaOrchestrator.resolveFileType({ extension }).category === 'image';
  }
}
