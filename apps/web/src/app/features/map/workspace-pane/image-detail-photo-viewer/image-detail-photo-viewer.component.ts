import { Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import type { PhotoLoadState } from '../../../../core/photo-load.model';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { PhotoLightboxComponent } from '../../../../shared/photo-lightbox/photo-lightbox.component';

@Component({
  selector: 'app-image-detail-photo-viewer',
  standalone: true,
  imports: [PhotoLightboxComponent],
  templateUrl: './image-detail-photo-viewer.component.html',
  styleUrl: '../image-detail-view.component.scss',
})
export class ImageDetailPhotoViewerComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly hasPhoto = input(false);
  readonly canOpenLightbox = input(false);
  readonly imageReady = input(false);
  readonly isImageLoading = input(false);
  readonly thumbState = input<PhotoLoadState>('idle');
  readonly fullState = input<PhotoLoadState>('idle');
  readonly thumbnailUrl = input<string | null>(null);
  readonly fullResUrl = input<string | null>(null);
  readonly fullResPreloaded = input(false);
  readonly displayTitle = input('');
  readonly replacing = input(false);
  readonly replaceError = input<string | null>(null);
  readonly acceptTypes = input('');

  readonly fileSelected = output<File>();
  readonly showLightbox = signal(false);

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  openLightbox(): void {
    if (!this.canOpenLightbox()) {
      return;
    }
    this.showLightbox.set(true);
  }

  triggerFileInput(): void {
    const input = this.fileInput()?.nativeElement;
    if (input) {
      input.value = '';
      input.click();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.fileSelected.emit(file);
    }
  }
}
