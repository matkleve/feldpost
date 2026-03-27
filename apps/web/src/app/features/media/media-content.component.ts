import { Component, input, output } from '@angular/core';
import type { ImageRecord } from '../map/workspace-pane/image-detail-view.types';
import type { CardVariant } from '../../shared/ui-primitives/card-variant.types';
import { MediaLoadingComponent } from './media-loading.component';
import { MediaErrorComponent } from './media-error.component';
import { MediaEmptyComponent } from './media-empty.component';
import { MediaGridComponent } from './media-grid.component';

@Component({
  selector: 'app-media-content',
  standalone: true,
  imports: [MediaLoadingComponent, MediaErrorComponent, MediaEmptyComponent, MediaGridComponent],
  templateUrl: './media-content.component.html',
  styleUrl: './media-content.component.scss',
})
export class MediaContentComponent {
  readonly loading = input.required<boolean>();
  readonly error = input.required<boolean>();
  readonly items = input.required<ImageRecord[]>();
  readonly emptyReason = input<'auth-required' | 'no-results'>('no-results');
  readonly cardVariant = input<CardVariant>('medium');
  readonly projectNameFor = input.required<(projectId: string | null) => string>();

  readonly itemClicked = output<string>();
  readonly retry = output<void>();
}
