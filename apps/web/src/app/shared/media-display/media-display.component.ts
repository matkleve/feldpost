import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
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
    '[class.media-display--fill-slot]': "slotGeometry() === 'fill'",
    '[class.media-display--intrinsic]': "slotGeometry() === 'intrinsic'",
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
  /** Storage path for the full-resolution asset. When provided, the display component registers
   * the media record with MediaDownloadService so getState() can initiate the signed-URL fetch.
   * @see docs/specs/component/media/media-display.md#rendering-pipeline */
  readonly storagePath = input<string | null>(null);
  /** Thumbnail storage path used for small/grid-tier requests. */
  readonly thumbnailPath = input<string | null>(null);
  readonly maxWidth: InputSignal<string> = input('100%');
  readonly maxHeight: InputSignal<string> = input('100%');
  readonly aspectRatio: InputSignal<number | null> = input<number | null>(null);
  /** `fill` = occupy parent slot (grid tiles); `intrinsic` = viewport sizes to media aspect ratio. */
  readonly slotGeometry = input<'fill' | 'intrinsic'>('fill');
  /** Notifies parent slot to update shared `--media-aspect-ratio` (CSS cannot inherit child → parent). */
  readonly aspectRatioChange = output<number>();
  readonly state = signal<MediaDisplayState>('idle');
  readonly slotSizeRem = signal(1);

  readonly resolvedUrl = signal('');
  readonly stagedContentUrl = signal('');
  readonly icon = signal('insert_drive_file');
  readonly metadataAspectRatio = signal<number | null>(null);

  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);
  readonly alt = computed(() => this.t('workspace.imageDetail.mediaPreview.alt', 'Media preview'));
  readonly noMediaLabel = computed(() => this.t('media.page.empty', 'No media found'));
  readonly showSharpContent = computed(() => {
    const current = this.state();
    return current === 'content-fade-in' || current === 'content-visible';
  });
  readonly showStagedPreview = computed(() => {
    const current = this.state();
    return current === 'media-ready';
  });

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
      const storagePath = this.storagePath();
      const thumbnailPath = this.thumbnailPath();
      const requestIdentity = id;

      if (!id) {
        this.resolvedUrl.set('');
        this.stagedContentUrl.set('');
        this.resetAspectRatio();
        this.lastRequestIdentity = '';
        this.goTo('idle');
        return;
      }

      const isNewHandoff = this.lastRequestIdentity !== requestIdentity;
      if (isNewHandoff) {
        this.resolvedUrl.set('');
        this.stagedContentUrl.set('');
        this.resetAspectRatio();
        this.lastRequestIdentity = requestIdentity;
        this.goTo('loading-surface-visible');
      }

      // Register storage paths before getState() subscription so that
      // requestPreviewIfKnown() inside getState() can initiate the signed-URL fetch.
      // @see docs/specs/component/media/media-display.md#rendering-pipeline
      if (storagePath) {
        this.mediaDownloadService.registerPreviewPaths(id, storagePath, thumbnailPath);
      }

      // Do not track slotSizeRem here — viewport resize after aspect-ratio transition must not
      // restart this effect (that was forcing loading-surface-visible after content reveal).
      const slot = untracked(() => this.slotSizeRem());

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

  onViewportGeometryTransitionEnd(event: TransitionEvent): void {
    if (event.propertyName !== 'aspect-ratio' || this.slotGeometry() !== 'intrinsic') {
      return;
    }

    if (this.state() === 'ratio-known-contain') {
      this.advanceAfterRatioSettled();
    }
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

  onContentImageLoad(event: Event): void {
    if (this.slotGeometry() !== 'intrinsic' || this.metadataAspectRatio() != null) {
      return;
    }

    const img = event.target;
    if (!(img instanceof HTMLImageElement)) {
      return;
    }

    const { naturalWidth, naturalHeight } = img;
    if (naturalWidth <= 0 || naturalHeight <= 0) {
      return;
    }

    const current = this.state();
    if (
      current !== 'loading-surface-visible' &&
      current !== 'ratio-known-contain' &&
      current !== 'media-ready'
    ) {
      return;
    }

    this.beginIntrinsicRatioTransition(naturalWidth / naturalHeight);
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
    const deliveryRatio =
      delivery.metadataAspectRatio != null && delivery.metadataAspectRatio > 0
        ? delivery.metadataAspectRatio
        : null;
    const deferRatioForShrinkTransition =
      this.slotGeometry() === 'intrinsic' &&
      deliveryRatio != null &&
      this.state() === 'loading-surface-visible';

    if (!deferRatioForShrinkTransition && deliveryRatio != null) {
      this.applyAspectRatio(deliveryRatio);
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
        if (!this.shouldAcceptLoadingDelivery()) {
          return;
        }
        this.goTo('loading-surface-visible');
        return;
      }
      case 'loaded': {
        const currentState = this.state();
        const intrinsic = this.slotGeometry() === 'intrinsic';

        if (intrinsic && currentState === 'loading-surface-visible') {
          if (deliveryRatio != null) {
            this.beginIntrinsicRatioTransition(deliveryRatio);
            return;
          }

          if (this.resolvedUrl()) {
            this.probeIntrinsicAspectRatioFromUrl(this.resolvedUrl());
          }
          return;
        }

        if (currentState === 'ratio-known-contain') {
          return;
        }

        if (currentState === 'loading-surface-visible') {
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

  private shouldAcceptLoadingDelivery(): boolean {
    const current = this.state();
    if (
      current === 'content-visible' ||
      current === 'content-fade-in' ||
      current === 'media-ready'
    ) {
      return false;
    }

    if (current === 'ratio-known-contain' && this.resolvedUrl().length > 0) {
      return false;
    }

    return true;
  }

  private probeIntrinsicAspectRatioFromUrl(url: string): void {
    if (this.slotGeometry() !== 'intrinsic' || !url.trim()) {
      return;
    }

    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      if (width > 0 && height > 0) {
        this.beginIntrinsicRatioTransition(width / height);
        return;
      }

      this.revealWithoutIntrinsicRatioTransition();
    };
    img.onerror = () => this.revealWithoutIntrinsicRatioTransition();
    img.src = url;
  }

  private revealWithoutIntrinsicRatioTransition(): void {
    const current = this.state();
    if (current === 'ratio-known-contain') {
      this.advanceAfterRatioSettled();
      return;
    }

    if (current === 'loading-surface-visible' || current === 'media-ready') {
      this.goTo('content-fade-in');
    }
  }

  private beginIntrinsicRatioTransition(ratio: number): void {
    if (this.slotGeometry() !== 'intrinsic') {
      this.applyAspectRatio(ratio);
      return;
    }

    const current = this.state();
    if (current !== 'loading-surface-visible' && current !== 'ratio-known-contain') {
      return;
    }

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        if (this.state() !== 'loading-surface-visible') {
          return;
        }

        this.goTo('ratio-known-contain');
        this.applyAspectRatio(ratio);
        this.scheduleRatioSettleCheck();
      });
      return;
    }

    this.goTo('ratio-known-contain');
    this.applyAspectRatio(ratio);
    this.scheduleRatioSettleCheck();
  }

  private scheduleRatioSettleCheck(): void {
    if (this.prefersReducedMotion()) {
      this.advanceAfterRatioSettled();
      return;
    }

    if (typeof requestAnimationFrame !== 'function') {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const viewport = this.hostEl.nativeElement.querySelector(
          '.media-display__viewport',
        ) as HTMLElement | null;
        if (!viewport || this.state() !== 'ratio-known-contain') {
          return;
        }

        const duration = this.readActiveTransitionDurationMs(viewport, 'aspect-ratio');
        if (duration <= 0) {
          this.advanceAfterRatioSettled();
        }
      });
    });
  }

  private readActiveTransitionDurationMs(element: HTMLElement, property: string): number {
    const style = getComputedStyle(element);
    const durations = style.transitionDuration.split(',').map((part) => part.trim());
    const properties = style.transitionProperty.split(',').map((part) => part.trim());

    let maxMs = 0;
    for (let i = 0; i < properties.length; i++) {
      if (properties[i] !== property) {
        continue;
      }

      const raw = durations[i] ?? durations[0] ?? '0s';
      const seconds = raw.endsWith('ms') ? parseFloat(raw) / 1000 : parseFloat(raw);
      if (Number.isFinite(seconds)) {
        maxMs = Math.max(maxMs, seconds * 1000);
      }
    }

    return maxMs;
  }

  private advanceAfterRatioSettled(): void {
    if (this.state() !== 'ratio-known-contain') {
      return;
    }

    if (this.resolvedUrl()) {
      this.goTo('content-fade-in');
      return;
    }

    this.goTo('media-ready');
  }

  private prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private applyAspectRatio(ratio: number): void {
    this.metadataAspectRatio.set(ratio);
    this.aspectRatioChange.emit(ratio);
  }

  private resetAspectRatio(): void {
    this.metadataAspectRatio.set(null);
    const hintedRatio = this.aspectRatio();
    if (hintedRatio != null && hintedRatio > 0) {
      this.applyAspectRatio(hintedRatio);
      return;
    }
    this.aspectRatioChange.emit(1);
  }

  private goTo(next: MediaDisplayState): void {
    const current = untracked(() => this.state());

    const target = transitionMediaDisplayState(current, next);
    if (target !== current) {
      this.state.set(target);
    }
  }
}
