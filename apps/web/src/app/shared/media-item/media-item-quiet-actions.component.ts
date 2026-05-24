import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { HLM_BUTTON_IMPORTS } from '../../shared/ui/button';
import {
  MediaItemMapActionComponent,
  type MediaItemMapZoomEvent,
} from './media-item-map-action.component';

// Stable state: interactive-unselected, interactive-selected,
// interactive-map-disabled, interactive-selected-map-disabled, disabled.
// @see docs/specs/component/media/media-item-quiet-actions.md#state-machine
export type MediaItemQuietActionsState =
  | 'interactive-unselected'
  | 'interactive-selected'
  | 'interactive-map-disabled'
  | 'interactive-selected-map-disabled'
  | 'disabled';

@Component({
  selector: 'app-media-item-quiet-actions',
  imports: [...HLM_BUTTON_IMPORTS, MediaItemMapActionComponent],
  templateUrl: './media-item-quiet-actions.component.html',
  styleUrl: './media-item-quiet-actions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.media-item-quiet-actions]': 'true',
    '[attr.data-state]': 'state()',
  },
})
export class MediaItemQuietActionsComponent {
  readonly state = input<MediaItemQuietActionsState>('interactive-unselected');
  readonly mediaItemId = input.required<string>();
  readonly legacyLatitude = input<number | null>(null);
  readonly legacyLongitude = input<number | null>(null);
  readonly legacyAddressLabel = input<string | null>(null);
  readonly selectLabel = input('');
  readonly mapLabel = input('');

  // Stable states with active selection visual treatment.
  // @see docs/specs/component/media/media-item-quiet-actions.md#state-machine
  readonly selected = computed(
    () =>
      this.state() === 'interactive-selected' ||
      this.state() === 'interactive-selected-map-disabled',
  );

  // Stable state with global interaction lock.
  // @see docs/specs/component/media/media-item-quiet-actions.md#state-machine
  readonly interactionsDisabled = computed(() => this.state() === 'disabled');

  // Stable states with map action lock: disabled, interactive-map-disabled, interactive-selected-map-disabled.
  // @see docs/specs/component/media/media-item-quiet-actions.md#state-machine
  readonly mapActionDisabled = computed(
    () =>
      this.interactionsDisabled() ||
      this.state() === 'interactive-map-disabled' ||
      this.state() === 'interactive-selected-map-disabled',
  );

  readonly selectRequested = output<void>();
  readonly mapZoomRequested = output<MediaItemMapZoomEvent>();

  onSelectClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.interactionsDisabled()) {
      return;
    }
    this.selectRequested.emit();
    this.releasePointerFocus(event);
  }

  /** Prevents :focus-within on the slot from keeping chrome visible after mouse use. */
  private releasePointerFocus(event: Event): void {
    const target = event.currentTarget;
    if (target instanceof HTMLElement) {
      target.blur();
    }
  }
}
