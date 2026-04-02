import { Component, computed, inject, input, output } from '@angular/core';
import type { ImageRecord } from '../map/workspace-pane/media-detail-view.types';
import type { CardVariant } from '../../shared/ui-primitives/card-variant.types';
import { MediaErrorComponent } from './media-error.component';
import { MediaEmptyComponent } from './media-empty.component';
import { WorkspaceSelectionService } from '../../core/workspace-selection.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { ItemGridComponent } from '../../shared/item-grid/item-grid.component';
import { ItemStateFrameComponent } from '../../shared/item-grid/item-state-frame.component';
import type { ItemDisplayMode } from '../../shared/item-grid/item.component';
import { MEDIA_ITEM_ACTION_CONTEXT, MediaItemComponent } from './media-item.component';

@Component({
  selector: 'app-media-content',
  standalone: true,
  imports: [
    ItemGridComponent,
    ItemStateFrameComponent,
    MediaItemComponent,
    MediaErrorComponent,
    MediaEmptyComponent,
  ],
  templateUrl: './media-content.component.html',
  styleUrl: './media-content.component.scss',
})
export class MediaContentComponent {
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly i18nService = inject(I18nService);

  readonly loading = input.required<boolean>();
  readonly error = input.required<boolean>();
  readonly items = input.required<ImageRecord[]>();
  readonly emptyReason = input<'auth-required' | 'no-results'>('no-results');
  readonly cardVariant = input<CardVariant>('medium');
  readonly projectNameFor = input.required<(projectId: string | null) => string>();
  readonly loadingPlaceholderIds = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  readonly mediaItemActionContext = MEDIA_ITEM_ACTION_CONTEXT;
  readonly loadingLabel = computed(() => this.t('common.loading', 'Loading media...'));

  readonly itemMode = computed<ItemDisplayMode>(() => {
    switch (this.cardVariant()) {
      case 'row':
        return 'row';
      case 'small':
        return 'grid-sm';
      case 'medium':
        return 'grid-md';
      case 'large':
        return 'grid-lg';
      default:
        return 'grid-md';
    }
  });

  readonly itemClicked = output<string>();
  readonly retry = output<void>();

  t(key: string, fallback: string): string {
    const value = this.i18nService.t(key, fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  }

  isSelected(mediaId: string): boolean {
    return this.workspaceSelectionService.isSelected(mediaId);
  }

  onSelectionToggled(mediaId: string): void {
    this.workspaceSelectionService.toggle(mediaId, { additive: true });
  }
}
