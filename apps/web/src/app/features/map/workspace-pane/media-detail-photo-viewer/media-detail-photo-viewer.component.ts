import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { PhotoLoadState } from '../../../../core/photo-load.model';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { PhotoLightboxComponent } from '../../../../shared/photo-lightbox/photo-lightbox.component';
import {
  UiButtonDirective,
  UiButtonPrimaryDirective,
  UiIconButtonGhostDirective,
} from '../../../../shared/ui-primitives/ui-primitives.directive';

@Component({
  selector: 'app-media-detail-photo-viewer',
  standalone: true,
  imports: [
    PhotoLightboxComponent,
    UiIconButtonGhostDirective,
    UiButtonDirective,
    UiButtonPrimaryDirective,
  ],
  templateUrl: './media-detail-photo-viewer.component.html',
  styleUrl: './media-detail-photo-viewer.component.scss',
})
export class MediaDetailPhotoViewerComponent implements AfterViewInit {
  private readonly i18nService = inject(I18nService);
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
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
  readonly slotMeasured = output<{ widthRem: number; heightRem: number }>();
  readonly showLightbox = signal(false);

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  private resizeObserver: ResizeObserver | null = null;
  private observedSlotElement: HTMLElement | null = null;

  constructor() {
    effect(() => {
      this.hasPhoto();
      queueMicrotask(() => this.observeCurrentSlot());
    });

    this.destroyRef.onDestroy(() => {
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
      this.observedSlotElement = null;
    });
  }

  ngAfterViewInit(): void {
    this.observeCurrentSlot();
  }

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

  private observeCurrentSlot(): void {
    const host = this.hostElement.nativeElement;
    const slotElement = host.querySelector(
      '.detail-image-wrap, .detail-upload-prompt',
    ) as HTMLElement | null;

    if (!slotElement) {
      return;
    }

    if (this.observedSlotElement === slotElement) {
      return;
    }

    if (typeof ResizeObserver === 'undefined') {
      const rect = slotElement.getBoundingClientRect();
      this.emitRemSlot(rect.width, rect.height);
      this.observedSlotElement = slotElement;
      return;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      this.emitRemSlot(entry.contentRect.width, entry.contentRect.height);
    });
    this.resizeObserver.observe(slotElement);

    const rect = slotElement.getBoundingClientRect();
    this.emitRemSlot(rect.width, rect.height);
    this.observedSlotElement = slotElement;
  }

  private emitRemSlot(widthPx: number, heightPx: number): void {
    if (widthPx <= 0 || heightPx <= 0) {
      return;
    }

    const rootSize = this.rootFontSizePx();
    this.slotMeasured.emit({
      widthRem: widthPx / rootSize,
      heightRem: heightPx / rootSize,
    });
  }

  private rootFontSizePx(): number {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return 16;
    }

    const rootSize = getComputedStyle(document.documentElement).fontSize;
    const parsed = Number.parseFloat(rootSize);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 16;
  }
}
