import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { ThumbnailSizePreset, WorkspaceImage } from '../../../../core/workspace-view.types';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { MediaOrchestratorService } from '../../../../core/media/media-orchestrator.service';
import type { MediaTier } from '../../../../core/media/media-renderer.types';
import { ThumbnailCardMediaComponent } from './thumbnail-card-media/thumbnail-card-media.component';

export interface ThumbnailCardInteraction {
  imageId: string;
  additive: boolean;
}

export interface ThumbnailCardHoverEvent {
  imageId: string;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-thumbnail-card',
  imports: [ThumbnailCardMediaComponent],
  template: `
    <article
      class="thumbnail-card ui-media-tile"
      [class.thumbnail-card--selected]="selected()"
      [class.thumbnail-card--linked-hover]="linkedHovered()"
      [class.thumbnail-card--row]="viewMode() === 'row'"
      [class.thumbnail-card--medium]="viewMode() === 'medium'"
      [class.thumbnail-card--large]="viewMode() === 'large'"
      (mouseenter)="onHoverStart()"
      (mouseleave)="onHoverEnd()"
    >
      <app-thumbnail-card-media
        [image]="image()"
        [imgLoading]="imgLoading()"
        [isLoading]="isLoading()"
        [imageReady]="imageReady()"
        [requestedTier]="requestedTier()"
        [slotWidthRem]="slotWidthRem()"
        [slotHeightRem]="slotHeightRem()"
        [rowMode]="viewMode() === 'row'"
        [altText]="t('workspace.thumbnailCard.photoThumbnail.alt', 'Photo thumbnail')"
        (imgLoaded)="onImgLoad()"
        (imgError)="onImgError()"
      ></app-thumbnail-card-media>

      <!-- Main action covering the card using stretch-link pattern -->
      <button
        class="thumbnail-card__main-link"
        type="button"
        [attr.aria-label]="
          t('workspace.thumbnailCard.action.viewImagePrefix', 'View image') +
          ' ' +
          (image().storagePath || displayName())
        "
        (click)="onCardClick($event)"
      ></button>

      @if (viewMode() === 'row') {
        <div class="thumbnail-card__meta" aria-hidden="true">
          <div class="thumbnail-card__meta-head">
            <p class="thumbnail-card__title">{{ displayName() }}</p>
            <p class="thumbnail-card__date">{{ capturedLabel() }}</p>
          </div>
          <p class="thumbnail-card__subtitle">{{ subtitle() }}</p>
        </div>
      }

      <button
        class="thumbnail-card__locate"
        type="button"
        [attr.aria-label]="t('workspace.thumbnailCard.action.jumpToLocation', 'Jump to location')"
        [attr.title]="t('workspace.thumbnailCard.action.jumpToLocation', 'Jump to location')"
        [disabled]="!hasCoordinates()"
        (click)="onZoomToLocationClick($event)"
      >
        <span class="material-icons" aria-hidden="true">near_me</span>
      </button>

      <button
        class="thumbnail-card__select"
        type="button"
        [class.thumbnail-card__select--active]="selected()"
        [attr.aria-pressed]="selected()"
        [attr.aria-label]="t('workspace.thumbnailCard.action.toggleSelection', 'Toggle selection')"
        (click)="onSelectClick($event)"
      >
        @if (selected()) {
          <span class="material-icons" aria-hidden="true">check</span>
        }
      </button>
    </article>
  `,
  styleUrl: './thumbnail-card.component.scss',
  host: {
    '[attr.data-tier-requested]': 'requestedTier()',
    '[attr.data-tier-effective]': 'effectiveTier()',
  },
})
export class ThumbnailCardComponent implements AfterViewInit {
  private readonly i18nService = inject(I18nService);
  private readonly mediaOrchestrator = inject(MediaOrchestratorService);
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);
  readonly image = input.required<WorkspaceImage>();
  readonly viewMode = input<ThumbnailSizePreset>('medium');
  readonly selected = input(false);
  readonly linkedHovered = input(false);
  readonly clicked = output<string>();
  readonly selectionToggled = output<ThumbnailCardInteraction>();
  readonly hoverStarted = output<ThumbnailCardHoverEvent>();
  readonly hoverEnded = output<string>();
  readonly zoomToLocationRequested = output<{ imageId: string; lat: number; lng: number }>();
  readonly hasCoordinates = computed(
    () => Number.isFinite(this.image().latitude) && Number.isFinite(this.image().longitude),
  );
  readonly displayName = computed(() => {
    const storagePath = this.image().storagePath;
    if (!storagePath) return this.t('workspace.thumbnailCard.fallback.image', 'Image');
    const parts = storagePath.split('/');
    return parts[parts.length - 1] || storagePath;
  });
  readonly subtitle = computed(() => {
    const project = this.image().projectName;
    const city = this.image().city;
    if (project && city) return `${project} · ${city}`;
    if (project) return project;
    if (city) return city;
    return this.t('workspace.thumbnailCard.fallback.photo', 'Photo');
  });
  readonly capturedLabel = computed(() => {
    const inputDate = this.image().capturedAt ?? this.image().createdAt;
    const date = new Date(inputDate);
    if (Number.isNaN(date.getTime())) {
      return this.t('workspace.thumbnailCard.fallback.unknown', 'Unknown');
    }
    return new Intl.DateTimeFormat(this.i18nService.locale(), {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  });

  readonly imgLoading = signal(true);
  readonly imgErrored = signal(false);
  readonly isLoading = computed(
    () =>
      (!this.image().signedThumbnailUrl && !this.image().thumbnailUnavailable) ||
      (!!this.image().signedThumbnailUrl && this.imgLoading() && !this.imgErrored()),
  );
  readonly imageReady = computed(
    () => !!this.image().signedThumbnailUrl && !this.imgLoading() && !this.imgErrored(),
  );
  readonly slotWidthRem = signal<number | null>(null);
  readonly slotHeightRem = signal<number | null>(null);
  readonly requestedTier = computed<MediaTier>(() =>
    this.requestedTierForViewMode(this.viewMode()),
  );
  readonly effectiveTier = computed<MediaTier>(() =>
    this.mediaOrchestrator.selectRequestedTierForSlot({
      requestedTier: this.requestedTier(),
      slotWidthRem: this.slotWidthRem(),
      slotHeightRem: this.slotHeightRem(),
      context: 'grid',
    }),
  );

  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
    });
  }

  ngAfterViewInit(): void {
    const element = this.hostElement.nativeElement;

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }
        this.updateSlotRem(entry.contentRect.width, entry.contentRect.height);
      });
      this.resizeObserver.observe(element);
    }

    const rect = element.getBoundingClientRect();
    this.updateSlotRem(rect.width, rect.height);
  }

  onCardClick(event: MouseEvent): void {
    if (event.ctrlKey || event.metaKey) {
      this.selectionToggled.emit({ imageId: this.image().id, additive: true });
      return;
    }

    this.clicked.emit(this.image().id);
  }

  onSelectClick(event: MouseEvent): void {
    event.stopPropagation();
    this.selectionToggled.emit({ imageId: this.image().id, additive: true });
  }

  onZoomToLocationClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.hasCoordinates()) return;
    this.zoomToLocationRequested.emit({
      imageId: this.image().id,
      lat: this.image().latitude,
      lng: this.image().longitude,
    });
  }

  onImgLoad(): void {
    this.imgLoading.set(false);
  }

  onImgError(): void {
    this.imgLoading.set(false);
    this.imgErrored.set(true);
  }

  onHoverStart(): void {
    if (!this.hasCoordinates()) return;
    this.hoverStarted.emit({
      imageId: this.image().id,
      lat: this.image().latitude,
      lng: this.image().longitude,
    });
  }

  onHoverEnd(): void {
    this.hoverEnded.emit(this.image().id);
  }

  private requestedTierForViewMode(viewMode: ThumbnailSizePreset): MediaTier {
    switch (viewMode) {
      case 'row':
        return 'inline';
      case 'small':
        return 'small';
      case 'medium':
        return 'mid';
      case 'large':
        return 'mid2';
      default:
        return 'small';
    }
  }

  private updateSlotRem(widthPx: number, heightPx: number): void {
    if (widthPx <= 0 || heightPx <= 0) {
      return;
    }

    const rootSizePx = this.rootFontSizePx();
    this.slotWidthRem.set(widthPx / rootSizePx);
    this.slotHeightRem.set(heightPx / rootSizePx);
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
