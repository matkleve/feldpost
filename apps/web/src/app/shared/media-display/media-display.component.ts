import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import type { AfterViewInit, InputSignal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { MediaDownloadService } from '../../core/media-download/media-download.service';
import { type MediaDisplayState, transitionMediaDisplayState } from './media-display-state';
import { type MediaDisplayDeliveryState } from './media-display.helpers';

const DEFAULT_ROOT_FONT_SIZE_PX = 16;
const SLOT_SIZE_REM_EPSILON = 0.05;

@Component({
  selector: 'app-media-display',
  templateUrl: './media-display.component.html',
  styleUrl: './media-display.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-state]': 'state()',
    '[class.media-display]': 'true',
  },
})
export class MediaDisplayComponent implements AfterViewInit {
  private readonly hostEl = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly mediaDownloadService = inject(MediaDownloadService);
  private readonly i18nService = inject(I18nService);

  private resizeObserver: ResizeObserver | null = null;
  private lastRequestIdentity = '';

  readonly mediaId: InputSignal<string> = input.required<string>();
  readonly maxWidth: InputSignal<string> = input('100%');
  readonly maxHeight: InputSignal<string> = input('100%');
  readonly aspectRatio: InputSignal<number | null> = input<number | null>(null);
  readonly state = signal<MediaDisplayState>('idle');
  readonly slotSizeRem = signal(1);

  readonly resolvedUrl = signal('');
  readonly stagedContentUrl = signal('');
  readonly icon = signal('insert_drive_file');
  readonly metadataAspectRatio = signal<number | null>(null);

  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);
  readonly alt = computed(() => this.t('workspace.imageDetail.mediaPreview.alt', 'Media preview'));
  readonly noMediaLabel = computed(() => this.t('media.page.empty', 'No media found'));

  constructor() {
    effect(() => {
      this.hostEl.nativeElement.style.setProperty('--media-display-max-width', this.maxWidth());
      this.hostEl.nativeElement.style.setProperty('--media-display-max-height', this.maxHeight());
    });

    effect(() => {
      const hintedRatio = this.aspectRatio();
      if (hintedRatio != null && hintedRatio > 0 && this.metadataAspectRatio() == null) {
        this.applyAspectRatio(hintedRatio);
      }
    });

    effect((onCleanup) => {
      const id = this.mediaId().trim();
      const requestIdentity = id;

      if (!id) {
        this.resolvedUrl.set('');
        this.stagedContentUrl.set('');
        this.resetAspectRatio();
        this.lastRequestIdentity = '';
        this.goTo('idle');
        return;
      }

      if (this.lastRequestIdentity !== requestIdentity) {
        this.resolvedUrl.set('');
        this.stagedContentUrl.set('');
        this.resetAspectRatio();
        this.lastRequestIdentity = requestIdentity;
      }

      this.goTo('loading-surface-visible');
      const slot = this.slotSizeRem();

      // TODO: migrate to signal-based when MediaDownloadService
      // is refactored off Observable
      const deliveryStreamSubscription = this.mediaDownloadService
        .getState(id, slot)
        .subscribe((delivery) => {
          this.handleDelivery(delivery);
        });

      onCleanup(() => deliveryStreamSubscription.unsubscribe());
    });

    this.destroyRef.onDestroy(() => {
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
    });
  }

  ngAfterViewInit(): void {
    this.setupResizeObserver();
  }

  onLayerTransitionEnd(event: TransitionEvent, layer: 'staged-content' | 'content'): void {
    if (event.propertyName !== 'opacity') {
      return;
    }

    if (layer === 'content' && this.state() === 'content-fade-in') {
      this.goTo('content-visible');
      return;
    }

    if (layer === 'staged-content' && this.state() === 'content-visible') {
      this.stagedContentUrl.set('');
    }
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const viewportElement = this.hostEl.nativeElement.querySelector(
      '.media-display__viewport',
    ) as HTMLElement | null;
    if (!viewportElement) {
      return;
    }

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const shortEdgePx = Math.min(entry.contentRect.width, entry.contentRect.height);
      const rootFontSize = this.readRootFontSize();
      const next = shortEdgePx > 0 ? shortEdgePx / rootFontSize : 1;
      if (Math.abs(this.slotSizeRem() - next) < SLOT_SIZE_REM_EPSILON) {
        return;
      }
      this.slotSizeRem.set(next);
    });

    ro.observe(viewportElement);
    this.resizeObserver = ro;
  }

  private readRootFontSize(): number {
    if (typeof document === 'undefined') {
      return DEFAULT_ROOT_FONT_SIZE_PX;
    }

    const raw = parseFloat(getComputedStyle(document.documentElement).fontSize);
    if (!Number.isFinite(raw) || raw <= 0) {
      return DEFAULT_ROOT_FONT_SIZE_PX;
    }
    return raw;
  }

  private handleDelivery(delivery: MediaDisplayDeliveryState): void {
    if (delivery.metadataAspectRatio != null && delivery.metadataAspectRatio > 0) {
      this.applyAspectRatio(delivery.metadataAspectRatio);
    }

    if (delivery.warmPreviewUrl) {
      this.stagedContentUrl.set(delivery.warmPreviewUrl);
    }

    if (delivery.resolvedUrl) {
      this.resolvedUrl.set(delivery.resolvedUrl);
    }

    if (delivery.icon) {
      this.icon.set(delivery.icon);
    }

    switch (delivery.state) {
      case 'loading':
      case 'warm-preview': {
        this.goTo('loading-surface-visible');
        return;
      }
      case 'loaded': {
        const currentState = this.state();

        if (currentState === 'loading-surface-visible' && this.hasKnownAspectRatio()) {
          this.goTo('ratio-known-contain');
        }

        if (this.state() === 'ratio-known-contain' || this.state() === 'loading-surface-visible') {
          this.goTo('media-ready');
        }

        if (this.state() === 'media-ready') {
          this.goTo('content-fade-in');
        }

        return;
      }
      case 'icon-only': {
        if (delivery.metadataAspectRatio == null && this.aspectRatio() == null) {
          this.applyAspectRatio(1);
        }
        this.goTo('icon-only');
        return;
      }
      case 'error': {
        this.goTo('error');
        return;
      }
      case 'no-media': {
        this.goTo('no-media');
        return;
      }
      default: {
        return;
      }
    }
  }

  private hasKnownAspectRatio(): boolean {
    const metadataRatio = this.metadataAspectRatio();
    if (metadataRatio != null && metadataRatio > 0) {
      return true;
    }

    const hintedRatio = this.aspectRatio();
    return hintedRatio != null && hintedRatio > 0;
  }

  private applyAspectRatio(ratio: number): void {
    this.metadataAspectRatio.set(ratio);
    this.hostEl.nativeElement.style.setProperty('--media-aspect-ratio', String(ratio));
  }

  private resetAspectRatio(): void {
    this.metadataAspectRatio.set(null);
    const hintedRatio = this.aspectRatio();
    if (hintedRatio != null && hintedRatio > 0) {
      this.applyAspectRatio(hintedRatio);
      return;
    }
    this.hostEl.nativeElement.style.removeProperty('--media-aspect-ratio');
  }

  private goTo(next: MediaDisplayState): void {
    const current = untracked(() => this.state());

    const target = transitionMediaDisplayState(current, next);
    if (target !== current) {
      this.state.set(target);
    }
  }
}
