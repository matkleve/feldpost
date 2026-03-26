import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnChanges,
  output,
  SimpleChanges,
  signal,
} from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { PhotoLoadService } from '../../core/photo-load.service';
import type { ImageRecord } from '../map/workspace-pane/image-detail-view.types';
import type { CardVariant } from '../../shared/ui-primitives/card-variant.types';

@Component({
  selector: 'app-media-card',
  standalone: true,
  templateUrl: './media-card.component.html',
  styleUrl: './media-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaCardComponent implements OnChanges {
  private readonly i18nService = inject(I18nService);
  private readonly photoLoadService = inject(PhotoLoadService);
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item']) {
      void this.resolveThumbnailUrl(this.item());
    }
  }

  get formattedCapturedAt(): string {
    return this.formatDate(this.item().captured_at, this.item().has_time);
  }

  get mediaTypeLabel(): string {
    const extension = this.fileExtension();
    if (!extension) {
      return '';
    }

    if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif', 'bmp'].includes(extension))
      return this.t('media.meta.type.image', 'Image');
    if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'].includes(extension))
      return this.t('media.meta.type.video', 'Video');
    if (extension === 'pdf') return this.t('media.meta.type.pdf', 'PDF');
    return extension.toUpperCase();
  }

  get fallbackIcon(): string {
    const extension = this.fileExtension();
    if (!extension) {
      return 'insert_drive_file';
    }

    if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif', 'bmp'].includes(extension)) {
      return 'image';
    }

    if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'].includes(extension)) {
      return 'movie';
    }

    if (extension === 'pdf') {
      return 'picture_as_pdf';
    }

    return 'insert_drive_file';
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
    return ['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif', 'bmp'].includes(extension);
  }
}
