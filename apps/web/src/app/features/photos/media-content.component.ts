import { Component, input, output } from '@angular/core';
import type { ImageRecord } from '../map/workspace-pane/image-detail-view.types';
import { MediaLoadingComponent } from './media-loading.component';
import { MediaErrorComponent } from './media-error.component';
import { MediaEmptyComponent } from './media-empty.component';
import { MediaGridComponent } from './media-grid.component';

@Component({
  selector: 'app-media-content',
  standalone: true,
  imports: [MediaLoadingComponent, MediaErrorComponent, MediaEmptyComponent, MediaGridComponent],
  template: `
    <section class="media-content">
      @if (loading()) {
        <app-media-loading />
      } @else if (error()) {
        <app-media-error (retry)="retry.emit()" />
      } @else if (items().length === 0) {
        <app-media-empty />
      } @else {
        <app-media-grid [items]="items()" (itemClicked)="itemClicked.emit($event)" />
      }
    </section>
  `,
  styles: [
    `
      .media-content {
        display: grid;
        gap: var(--spacing-3);
      }
    `,
  ],
})
export class MediaContentComponent {
  readonly loading = input.required<boolean>();
  readonly error = input.required<boolean>();
  readonly items = input.required<ImageRecord[]>();

  readonly itemClicked = output<string>();
  readonly retry = output<void>();
}
