import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { inject } from '@angular/core';
import type { ImageRecord } from '../map/workspace-pane/image-detail-view.types';
import { WorkspaceSelectionService } from '../../core/workspace-selection.service';
import { CardGridComponent } from '../../shared/ui-primitives/card-grid.component';

@Component({
  selector: 'app-media-grid',
  standalone: true,
  imports: [CardGridComponent],
  templateUrl: './media-grid.component.html',
  styleUrl: './media-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaGridComponent {
  protected readonly workspaceSelectionService = inject(WorkspaceSelectionService);

  readonly items = input.required<ImageRecord[]>();
  readonly itemClicked = output<string>();

  onItemClicked(mediaId: string): void {
    this.itemClicked.emit(mediaId);
  }

  onItemKeydown(event: KeyboardEvent, mediaId: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onItemClicked(mediaId);
    }
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return '';
    }
  }
}
