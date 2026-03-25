import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ImageRecord } from '../map/workspace-pane/image-detail-view.types';
import type { CardVariant } from '../../shared/ui-primitives/card-variant.types';

@Component({
  selector: 'app-media-card',
  standalone: true,
  templateUrl: './media-card.component.html',
  styleUrl: './media-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaCardComponent {
  readonly item = input.required<ImageRecord>();
  readonly variant = input<CardVariant>('medium');

  formatDate(dateString: string | null): string {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return '';
    }
  }
}
