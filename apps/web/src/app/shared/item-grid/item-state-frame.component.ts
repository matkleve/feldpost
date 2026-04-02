import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { ItemDisplayMode } from './item.component';

@Component({
  selector: 'app-item-state-frame',
  imports: [],
  templateUrl: './item-state-frame.component.html',
  styleUrl: './item-state-frame.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemStateFrameComponent {
  readonly itemId = input.required<string>();
  readonly mode = input<ItemDisplayMode>('grid-md');
  readonly loading = input(false);
  readonly error = input(false);
  readonly empty = input(false);
  readonly selected = input(false);
  readonly disabled = input(false);

  readonly loadingLabel = input('Loading item');
  readonly errorLabel = input('Could not load item');
  readonly emptyLabel = input('No content available');
  readonly retryLabel = input('Retry');

  readonly retryRequested = output<string>();

  // Applies non-overridable state priority across all item domains.
  // @see docs/element-specs/item-grid.md#state
  readonly showErrorState = computed(() => this.error());
  readonly showEmptyState = computed(() => !this.showErrorState() && this.empty());
  readonly showLoadingState = computed(
    () => !this.showErrorState() && !this.showEmptyState() && this.loading(),
  );

  readonly hideProjectedContent = computed(
    () => this.showLoadingState() || this.showErrorState() || this.showEmptyState(),
  );

  onRetryClick(): void {
    this.retryRequested.emit(this.itemId());
  }
}
