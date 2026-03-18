import { Component, computed, inject, input, output, signal } from '@angular/core';
import type { ThumbnailSizePreset, WorkspaceImage } from '../../../core/workspace-view.types';
import { PHOTO_PLACEHOLDER_ICON, PHOTO_NO_PHOTO_ICON } from '../../../core/photo-load.service';
import { I18nService } from '../../../core/i18n/i18n.service';

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
  template: `
    <article
      class="thumbnail-card"
      [class.thumbnail-card--selected]="selected()"
      [class.thumbnail-card--linked-hover]="linkedHovered()"
      [class.thumbnail-card--row]="viewMode() === 'row'"
      [class.thumbnail-card--medium]="viewMode() === 'medium'"
      [class.thumbnail-card--large]="viewMode() === 'large'"
      (mouseenter)="onHoverStart()"
      (mouseleave)="onHoverEnd()"
    >
      <button
        class="thumbnail-card__main"
        type="button"
        [attr.aria-label]="
          t('workspace.thumbnailCard.action.viewImagePrefix', 'View image') +
          ' ' +
          (image().storagePath || displayName())
        "
        (click)="onCardClick($event)"
      >
        <div class="thumbnail-card__media">
          @if (image().signedThumbnailUrl) {
            <img
              class="thumbnail-card__img"
              [class.thumbnail-card__img--loaded]="!imgLoading()"
              [src]="image().signedThumbnailUrl"
              [alt]="t('workspace.thumbnailCard.photoThumbnail.alt', 'Photo thumbnail')"
              loading="lazy"
              (load)="onImgLoad()"
              (error)="onImgError()"
            />
          }
          @if (!imageReady()) {
            <div
              class="thumbnail-card__placeholder"
              [class.thumbnail-card__placeholder--loading]="isLoading()"
              [class.thumbnail-card__placeholder--no-photo]="!isLoading()"
            >
              <span
                class="thumbnail-card__placeholder-icon"
                [class.thumbnail-card__placeholder-icon--no-photo]="!isLoading()"
                aria-hidden="true"
              ></span>
            </div>
          }
        </div>

        @if (viewMode() === 'row') {
          <div class="thumbnail-card__meta" aria-hidden="true">
            <div class="thumbnail-card__meta-head">
              <p class="thumbnail-card__title">{{ displayName() }}</p>
              <p class="thumbnail-card__date">{{ capturedLabel() }}</p>
            </div>
            <p class="thumbnail-card__subtitle">{{ subtitle() }}</p>
          </div>
        }
      </button>

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
    '[style.--placeholder-icon]': 'placeholderIconUrl',
    '[style.--no-photo-icon]': 'noPhotoIconUrl',
  },
})
export class ThumbnailCardComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);
  readonly placeholderIconUrl = `url("${PHOTO_PLACEHOLDER_ICON}")`;
  readonly noPhotoIconUrl = `url("${PHOTO_NO_PHOTO_ICON}")`;
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
    const input = this.image().capturedAt ?? this.image().createdAt;
    const date = new Date(input);
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
  /** True while the <img> element is still loading from network. */
  readonly imgLoading = signal(true);
  /** True when the <img> errored (broken URL). */
  readonly imgErrored = signal(false);
  /** True when actively loading (waiting for signed URL or image download). */
  readonly isLoading = computed(
    () =>
      (!this.image().signedThumbnailUrl && !this.image().thumbnailUnavailable) ||
      (!!this.image().signedThumbnailUrl && this.imgLoading() && !this.imgErrored()),
  );
  /** True when the image has fully loaded and is ready to display. */
  readonly imageReady = computed(
    () => !!this.image().signedThumbnailUrl && !this.imgLoading() && !this.imgErrored(),
  );

  onCardClick(event: MouseEvent): void {
    if (event.ctrlKey || event.metaKey) {
      this.selectionToggled.emit({ imageId: this.image().id, additive: true });
      return;
    }

    this.clicked.emit(this.image().id);
  }

  onSelectClick(event: MouseEvent): void {
    event.stopPropagation();
    this.selectionToggled.emit({
      imageId: this.image().id,
      additive: true,
    });
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
}
