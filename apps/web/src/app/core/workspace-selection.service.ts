import { Injectable, computed, signal } from '@angular/core';

export interface SelectionToggleOptions {
  additive: boolean;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceSelectionService {
  readonly selectedMediaIds = signal<Set<string>>(new Set());
  readonly selectedCount = computed(() => this.selectedMediaIds().size);

  isSelected(id: string): boolean {
    return this.selectedMediaIds().has(id);
  }

  toggle(id: string, options: SelectionToggleOptions): void {
    this.selectedMediaIds.update((existing) => {
      const next = new Set(existing);
      if (options.additive) {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      }

      if (next.size === 1 && next.has(id)) {
        return new Set();
      }

      return new Set([id]);
    });
  }

  setSingle(id: string): void {
    this.selectedMediaIds.set(new Set([id]));
  }

  selectAllInScope(scopeIds: string[]): void {
    this.selectedMediaIds.set(new Set(scopeIds));
  }

  clearSelection(): void {
    this.selectedMediaIds.set(new Set());
  }
}
