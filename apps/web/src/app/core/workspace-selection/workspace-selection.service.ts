import { Injectable, computed, signal } from '@angular/core';

export interface SelectionToggleOptions {
  additive: boolean;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceSelectionService {
  private readonly _selectedMediaIds = signal<Set<string>>(new Set());
  readonly selectedMediaIds = this._selectedMediaIds.asReadonly();

  readonly selectedCount = computed(() => this._selectedMediaIds().size);

  isSelected(id: string): boolean {
    return this._selectedMediaIds().has(id);
  }

  toggle(id: string, options: SelectionToggleOptions): void {
    this._selectedMediaIds.update((existing) => {
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
    this._selectedMediaIds.set(new Set([id]));
  }

  selectAllInScope(scopeIds: string[]): void {
    this._selectedMediaIds.set(new Set(scopeIds));
  }

  clearSelection(): void {
    this._selectedMediaIds.set(new Set());
  }
}
