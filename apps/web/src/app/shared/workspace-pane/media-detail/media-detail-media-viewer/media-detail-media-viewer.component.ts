import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { PreviewGenerationStatus } from '../../../../core/media/preview-generation-status.types';
import { MediaDownloadService } from '../../../../core/media-download/media-download.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { PhotoLightboxComponent } from '../../../photo-lightbox/photo-lightbox.component';
import { MediaDisplayComponent } from '../../../media-display/media-display.component';
import { HLM_BUTTON_IMPORTS } from '../../../ui/button';

@Component({
  selector: 'app-media-detail-media-viewer',
  standalone: true,
  imports: [MediaDisplayComponent, PhotoLightboxComponent, ...HLM_BUTTON_IMPORTS],
  templateUrl: './media-detail-media-viewer.component.html',
  styleUrl: './media-detail-media-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaDetailMediaViewerComponent {
  private readonly i18nService = inject(I18nService);
  private readonly mediaDownloadService = inject(MediaDownloadService);

  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  readonly hasPhoto = input(false);
  readonly mediaId = input.required<string>();
  readonly storagePath = input<string | null>(null);
  readonly thumbnailPath = input<string | null>(null);
  readonly previewGenerationStatus = input<PreviewGenerationStatus | null>(null);
  readonly originalFilename = input<string | null>(null);
  readonly aspectRatioHint = input<number | null>(null);
  readonly contentObjectPosition = input('center center');
  readonly isImageLike = input(false);
  readonly displayTitle = input('');
  readonly replacing = input(false);
  readonly replaceError = input<string | null>(null);
  readonly acceptTypes = input('');

  readonly fileSelected = output<File>();
  readonly contextMenuRequested = output<void>();

  readonly showLightbox = signal(false);
  readonly mediaAspectRatio = signal('1');

  private readonly mediaPreview = viewChild(MediaDisplayComponent);

  readonly canOpenLightbox = computed(() => {
    if (!this.isImageLike()) {
      return false;
    }
    const preview = this.mediaPreview();
    if (!preview) {
      return false;
    }
    const state = preview.state();
    return state === 'content-visible' || state === 'content-fade-in' || !!preview.resolvedUrl();
  });

  readonly lightboxImageUrl = computed(() => {
    const id = this.mediaId().trim();
    if (!id) {
      return null;
    }
    return (
      this.mediaDownloadService.getCachedUrl(id, 'full') ??
      this.mediaPreview()?.resolvedUrl() ??
      this.mediaDownloadService.getCachedUrl(id, 'thumb')
    );
  });

  onMediaAspectRatioChange(ratio: number): void {
    if (!Number.isFinite(ratio) || ratio <= 0) {
      return;
    }
    this.mediaAspectRatio.set(String(ratio));
  }

  onSlotGeometryTransitionEnd(event: TransitionEvent): void {
    if (event.propertyName !== 'aspect-ratio' && event.propertyName !== 'inline-size') {
      return;
    }
    this.mediaPreview()?.onSlotGeometryTransitionEnd();
  }

  openLightbox(): void {
    if (!this.canOpenLightbox() || !this.lightboxImageUrl()) {
      return;
    }
    this.showLightbox.set(true);
  }

  requestContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
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

  constructor() {
    effect(() => {
      this.mediaId();
      this.mediaAspectRatio.set('1');
    });
  }
}
