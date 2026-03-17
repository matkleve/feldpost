import { Component, computed, input, output, signal } from '@angular/core';
import type { WorkspaceImage } from '../../../core/workspace-view.types';
import { PHOTO_PLACEHOLDER_ICON, PHOTO_NO_PHOTO_ICON } from '../../../core/photo-load.service';

export interface ThumbnailCardInteraction {
  imageId: string;
  additive: boolean;
}

@Component({
  selector: 'app-thumbnail-card',
  template: `
    <article class="thumbnail-card" [class.thumbnail-card--selected]="selected()">
      <button
        class="thumbnail-card__main"
        type="button"
        [attr.aria-label]="'View image ' + image().storagePath"
        (click)="onCardClick($event)"
      >
        @if (image().signedThumbnailUrl) {
          <img
            class="thumbnail-card__img"
            [class.thumbnail-card__img--loaded]="!imgLoading()"
            [src]="image().signedThumbnailUrl"
            [alt]="'Photo thumbnail'"
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
      </button>

      <button
        class="thumbnail-card__select"
        type="button"
        [class.thumbnail-card__select--active]="selected()"
        [attr.aria-pressed]="selected()"
        aria-label="Toggle selection"
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
  readonly placeholderIconUrl = `url("${PHOTO_PLACEHOLDER_ICON}")`;
  readonly noPhotoIconUrl = `url("${PHOTO_NO_PHOTO_ICON}")`;
  readonly image = input.required<WorkspaceImage>();
  readonly selected = input(false);
  readonly clicked = output<string>();
  readonly selectionToggled = output<ThumbnailCardInteraction>();
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
      additive: !!(event.ctrlKey || event.metaKey),
    });
  }

  onImgLoad(): void {
    this.imgLoading.set(false);
  }

  onImgError(): void {
    this.imgLoading.set(false);
    this.imgErrored.set(true);
  }
}
