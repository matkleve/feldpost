import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import type { ImageRecord } from '../map/workspace-pane/image-detail-view.types';
import type { CardVariant } from '../../shared/ui-primitives/card-variant.types';

@Component({
  selector: 'app-media-card',
  standalone: true,
  templateUrl: './media-card.component.html',
  styleUrl: './media-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaCardComponent {
  private readonly i18nService = inject(I18nService);

  readonly item = input.required<ImageRecord>();
  readonly variant = input<CardVariant>('medium');
  readonly projectName = input<string>('');

  readonly select = output<void>();
  readonly open = output<void>();
  readonly locate = output<void>();

  readonly t = (key: string, fallback = ''): string => {
    const value = this.i18nService.t(key, fallback);
    if (typeof value === 'string' && value.trim().length > 0) return value;
    if (fallback.trim().length > 0) return fallback;
    return key;
  };

  get formattedCapturedAt(): string {
    return this.formatDate(this.item().captured_at, this.item().has_time);
  }

  get mediaTypeLabel(): string {
    const storagePath = this.item().storage_path;
    if (!storagePath) {
      return '';
    }

    const extension = storagePath.split('.').pop()?.toLowerCase() ?? '';
    if (extension.length === 0) {
      return '';
    }

    if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif', 'bmp'].includes(extension))
      return this.t('media.meta.type.image', 'Image');
    if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'].includes(extension))
      return this.t('media.meta.type.video', 'Video');
    if (extension === 'pdf') return this.t('media.meta.type.pdf', 'PDF');
    return extension.toUpperCase();
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
}
