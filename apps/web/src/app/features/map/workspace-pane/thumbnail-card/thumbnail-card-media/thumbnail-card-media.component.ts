import { Component, input, output } from '@angular/core';
import type { WorkspaceImage } from '../../../../../core/workspace-view.types';

@Component({
  selector: 'app-thumbnail-card-media',
  standalone: true,
  template: `
    @if (image().signedThumbnailUrl) {
      <img
        class="thumbnail-card-media__img"
        [class.thumbnail-card-media__img--loaded]="!imgLoading()"
        [src]="image().signedThumbnailUrl"
        [alt]="altText()"
        loading="lazy"
        (load)="imgLoaded.emit()"
        (error)="imgError.emit()"
      />
    }
    @if (!imageReady()) {
      <div
        class="thumbnail-card-media__placeholder"
        [class.thumbnail-card-media__placeholder--loading]="isLoading()"
        [class.thumbnail-card-media__placeholder--no-photo]="!isLoading()"
      >
        <span
          class="thumbnail-card-media__placeholder-icon"
          [class.thumbnail-card-media__placeholder-icon--no-photo]="!isLoading()"
          aria-hidden="true"
        ></span>
      </div>
    }
  `,
  styleUrl: './thumbnail-card-media.component.scss',
})
export class ThumbnailCardMediaComponent {
  readonly image = input.required<WorkspaceImage>();
  readonly imgLoading = input(true);
  readonly isLoading = input(false);
  readonly imageReady = input(false);
  readonly altText = input('Photo thumbnail');

  readonly imgLoaded = output<void>();
  readonly imgError = output<void>();
}
