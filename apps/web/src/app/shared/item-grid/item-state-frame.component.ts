import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { ItemDisplayMode, ItemVisualState } from './item.component';

@Component({
  selector: 'app-item-state-frame',
  imports: [],
  templateUrl: './item-state-frame.component.html',
  styleUrl: './item-state-frame.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-state]': 'state()',
    '[class.item-state-frame--disabled]': 'disabled()',
  },
})
export class ItemStateFrameComponent {
  readonly itemId = input.required<string>();
  readonly mode = input<ItemDisplayMode>('grid-md');

  // Stable states: content, loading, error, empty, selected, disabled.
  // @see docs/element-specs/item-state-frame.md#state-machine
  readonly state = input<ItemVisualState>('content');

  readonly loadingLabel = input('Loading item');
  readonly errorLabel = input('Could not load item');
  readonly emptyLabel = input('No content available');
  readonly retryLabel = input('Retry');

  readonly retryRequested = output<string>();

  // Stable state: disabled applies shared interaction lock and dimming.
  // @see docs/element-specs/item-state-frame.md#state-machine
  readonly disabled = computed(() => this.state() === 'disabled');

  // Stable state: error.
  // @see docs/element-specs/item-state-frame.md#state-machine
  // Applies non-overridable state priority across all item domains.
  // @see docs/element-specs/item-grid.md#state
  readonly showErrorState = computed(() => this.state() === 'error');

  // Stable state: empty.
  // @see docs/element-specs/item-state-frame.md#state-machine
  readonly showEmptyState = computed(() => this.state() === 'empty');

  // Stable state: loading.
  // @see docs/element-specs/item-state-frame.md#state-machine
  readonly showLoadingState = computed(() => this.state() === 'loading');

  readonly hideProjectedContent = computed(
    () => this.showLoadingState() || this.showErrorState() || this.showEmptyState(),
  );

  onRetryClick(): void {
    this.retryRequested.emit(this.itemId());
  }
}
