import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { MediaRecord } from '../../../../core/media-query/media-query.types';
import { MediaDownloadService } from '../../../../core/media-download/media-download.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { PhotoLightboxComponent } from '../../../photo-lightbox/photo-lightbox.component';
import { MediaItemComponent } from '../../../media-item/media-item.component';
import { HLM_BUTTON_IMPORTS } from '../../../ui/button';

@Component({
  selector: 'app-media-detail-media-viewer',
  standalone: true,
  imports: [MediaItemComponent, PhotoLightboxComponent, ...HLM_BUTTON_IMPORTS],
  templateUrl: './media-detail-media-viewer.component.html',
  styleUrl: './media-detail-media-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaDetailMediaViewerComponent {
  private readonly i18nService = inject(I18nService);
  private readonly mediaDownloadService = inject(MediaDownloadService);

  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  readonly item = input<MediaRecord | null>(null);
  readonly mediaId = input.required<string>();
  readonly isImageLike = input(false);
  readonly displayTitle = input('');
  readonly replacing = input(false);
  readonly replaceError = input<string | null>(null);
  readonly acceptTypes = input('');

  readonly fileSelected = output<File>();
  readonly contextMenuRequested = output<void>();

  readonly showLightbox = signal(false);

  readonly hasPhoto = computed(() => Boolean(this.item()?.storage_path?.trim()));

  readonly lightboxImageUrl = computed(() => {
    const id = this.mediaId().trim();
    if (!id) {
      return null;
    }
    return (
      this.mediaDownloadService.getCachedUrl(id, 'full') ??
      this.mediaDownloadService.getCachedUrl(id, 'thumb')
    );
  });

  readonly canOpenLightbox = computed(
    () => this.isImageLike() && Boolean(this.lightboxImageUrl()),
  );

  onItemPointerClick(modifiers: {
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
  }): void {
    if (modifiers.shiftKey || modifiers.ctrlKey || modifiers.metaKey) {
      return;
    }
    this.openLightbox();
  }

  openLightbox(): void {
    if (!this.isImageLike()) {
      return;
    }
    const id = this.mediaId().trim();
    if (!id) {
      return;
    }
    void this.mediaDownloadService.requestFullPreview(id).then(() => {
      if (this.lightboxImageUrl()) {
        this.showLightbox.set(true);
      }
    });
  }

  onEmbedContextMenu(): void {
    this.contextMenuRequested.emit();
  }

  triggerFileInput(): void {
    const inputEl = document.getElementById(this.fileInputId) as HTMLInputElement | null;
    if (inputEl) {
      inputEl.value = '';
      inputEl.click();
    }
  }

  onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    if (file) {
      this.fileSelected.emit(file);
    }
  }

  readonly fileInputId = 'media-detail-file-input';
}
