import { Component, input, output } from '@angular/core';
import type { WorkspaceImage } from '../../../core/workspace-view.types';

@Component({
  selector: 'app-thumbnail-card',
  template: `
    <button
      class="thumbnail-card"
      type="button"
      [attr.aria-label]="'View image ' + image().storagePath"
      (click)="clicked.emit(image().id)"
    >
      @if (image().signedThumbnailUrl) {
        <img
          class="thumbnail-card__img"
          [src]="image().signedThumbnailUrl"
          [alt]="'Photo thumbnail'"
          loading="lazy"
        />
      } @else {
        <div class="thumbnail-card__placeholder">
          <span class="material-icons" aria-hidden="true">image</span>
        </div>
      }
      <div class="thumbnail-card__overlay">
        @if (image().projectName) {
          <span class="thumbnail-card__badge">{{ image().projectName }}</span>
        }
      </div>
    </button>
  `,
  styleUrl: './thumbnail-card.component.scss',
})
export class ThumbnailCardComponent {
  readonly image = input.required<WorkspaceImage>();
  readonly clicked = output<string>();
}
