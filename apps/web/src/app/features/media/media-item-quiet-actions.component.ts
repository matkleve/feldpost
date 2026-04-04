import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  UiButtonDirective,
  UiButtonIconOnlyDirective,
  UiButtonSecondaryDirective,
  UiButtonSizeSmDirective,
} from '../../shared/ui-primitives/ui-primitives.directive';

// Stable state: interactive-unselected, interactive-selected,
// interactive-map-disabled, interactive-selected-map-disabled, disabled.
// @see docs/element-specs/media-item-quiet-actions.md#state-machine
export type MediaItemQuietActionsState =
  | 'interactive-unselected'
  | 'interactive-selected'
  | 'interactive-map-disabled'
  | 'interactive-selected-map-disabled'
  | 'disabled';

@Component({
  selector: 'app-media-item-quiet-actions',
  imports: [
    UiButtonDirective,
    UiButtonSizeSmDirective,
    UiButtonSecondaryDirective,
    UiButtonIconOnlyDirective,
  ],
  templateUrl: './media-item-quiet-actions.component.html',
  styleUrl: './media-item-quiet-actions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaItemQuietActionsComponent {
  readonly state = input<MediaItemQuietActionsState>('interactive-unselected');
  readonly selectLabel = input('');
  readonly mapLabel = input('');

  // Stable states with active selection visual treatment.
  // @see docs/element-specs/media-item-quiet-actions.md#state-machine
  readonly selected = computed(
    () =>
      this.state() === 'interactive-selected' ||
      this.state() === 'interactive-selected-map-disabled',
  );

  // Stable state with global interaction lock.
  // @see docs/element-specs/media-item-quiet-actions.md#state-machine
  readonly interactionsDisabled = computed(() => this.state() === 'disabled');

  // Stable states with map action lock: disabled, interactive-map-disabled, interactive-selected-map-disabled.
  // @see docs/element-specs/media-item-quiet-actions.md#state-machine
  readonly mapActionDisabled = computed(
    () =>
      this.interactionsDisabled() ||
      this.state() === 'interactive-map-disabled' ||
      this.state() === 'interactive-selected-map-disabled',
  );

  readonly selectRequested = output<void>();
  readonly mapRequested = output<void>();

  onSelectClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.interactionsDisabled()) {
      return;
    }
    this.selectRequested.emit();
  }

  onMapClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.mapActionDisabled()) {
      return;
    }
    this.mapRequested.emit();
  }
}
