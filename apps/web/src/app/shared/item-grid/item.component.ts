import { Directive, computed, input, output } from '@angular/core';

export type ItemDisplayMode = 'grid-sm' | 'grid-md' | 'grid-lg' | 'row' | 'card';

export type ItemContextActionEvent = {
  itemId: string;
  actionId: string;
  contextId: string | null;
};

@Directive()
export abstract class ItemComponent {
  readonly itemId = input.required<string>();
  readonly mode = input<ItemDisplayMode>('grid-md');
  readonly loading = input(false);
  readonly error = input(false);
  readonly empty = input(false);
  readonly selected = input(false);
  readonly disabled = input(false);
  readonly actionContextId = input<string | null>(null);

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
