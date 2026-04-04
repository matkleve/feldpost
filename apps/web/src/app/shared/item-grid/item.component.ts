import { Directive, computed, input, output } from '@angular/core';

export type ItemDisplayMode = 'grid-sm' | 'grid-md' | 'grid-lg' | 'row' | 'card';
export type ItemVisualState = 'content' | 'loading' | 'error' | 'empty' | 'selected' | 'disabled';

export type ItemContextActionEvent = {
  itemId: string;
  actionId: string;
  contextId: string | null;
};

@Directive()
export abstract class ItemComponent {
  readonly itemId = input.required<string>();
  readonly mode = input<ItemDisplayMode>('grid-md');
  readonly state = input<ItemVisualState>('content');
  readonly actionContextId = input<string | null>(null);

  readonly loading = computed(() => this.state() === 'loading');
  readonly error = computed(() => this.state() === 'error');
  readonly empty = computed(() => this.state() === 'empty');
  readonly selected = computed(() => this.state() === 'selected');
  readonly disabled = computed(() => this.state() === 'disabled');

  readonly selectedChange = output<boolean>();
  readonly opened = output<string>();
  readonly retryRequested = output<string>();
  readonly contextActionRequested = output<ItemContextActionEvent>();

  // Computes canonical item state precedence used by every domain item.
  // @see docs/element-specs/item-grid.md#state
  readonly showErrorState = computed(() => this.error());
  readonly showEmptyState = computed(() => !this.showErrorState() && this.empty());
  readonly showLoadingState = computed(
    () => !this.showErrorState() && !this.showEmptyState() && this.loading(),
  );

  protected emitOpened(): void {
    this.opened.emit(this.itemId());
  }

  protected emitRetryRequested(): void {
    this.retryRequested.emit(this.itemId());
  }

  protected emitSelectedChange(nextSelected: boolean): void {
    this.selectedChange.emit(nextSelected);
  }

  protected emitContextAction(actionId: string): void {
    this.contextActionRequested.emit({
      itemId: this.itemId(),
      actionId,
      contextId: this.actionContextId(),
    });
  }
}
