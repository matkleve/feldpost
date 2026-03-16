import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { WorkspaceViewService } from '../../../../core/workspace-view.service';
import { PropertyRegistryService } from '../../../../core/property-registry.service';
import type { SortConfig } from '../../../../core/workspace-view.types';

export type SortDropdownOption = {
  id: string;
  label: string;
  icon: string;
  defaultDirection: 'asc' | 'desc';
};

@Component({
  selector: 'app-sort-dropdown',
  template: `
    <div class="sort-dropdown">
      <div class="dd-search">
        <input
          class="dd-search__input"
          type="text"
          placeholder="Search properties…"
          [value]="searchTerm()"
          (input)="searchTerm.set($any($event.target).value)"
        />
        @if (searchTerm()) {
          <button class="dd-search__action" (click)="searchTerm.set('')" aria-label="Clear search">
            <span class="material-icons">close</span>
          </button>
        } @else if (hasCustomSort()) {
          <button class="dd-search__action" (click)="resetSort()" aria-label="Reset to default">
            <span class="material-icons">restart_alt</span>
          </button>
        }
      </div>
      <div class="dd-items">
        @if (groupedOptions().length > 0) {
          <div class="dd-section-label">Sorted by grouping</div>
          @for (opt of groupedOptions(); track opt.id) {
            <button
              class="dd-item dd-item--active"
              (click)="toggleSort(opt.id); $event.stopPropagation()"
            >
              <span class="material-icons dd-item__icon" aria-hidden="true">{{ opt.icon }}</span>
              <span class="dd-item__label">{{ opt.label }}</span>
              <span
                class="sort-direction sort-direction--visible"
                role="button"
                tabindex="0"
                (click)="toggleSort(opt.id); $event.stopPropagation()"
                (keydown.enter)="toggleSort(opt.id); $event.stopPropagation()"
                [attr.aria-label]="'Sort ' + getDirectionLabel(opt.id)"
              >
                <span class="sort-direction__state-current">{{ getDirectionSymbol(opt.id) }}</span>
                <span class="sort-direction__state-next">{{ getNextDirectionSymbol(opt.id) }}</span>
              </span>
            </button>
          }
          <div class="dd-divider"></div>
        }
        @for (opt of filteredOptions(); track opt.id) {
          <button
            class="dd-item"
            [class.dd-item--active]="isSortActive(opt.id)"
            (click)="toggleSort(opt.id); $event.stopPropagation()"
          >
            <span class="material-icons dd-item__icon" aria-hidden="true">{{ opt.icon }}</span>
            <span class="dd-item__label">{{ opt.label }}</span>
            <span
              class="sort-direction"
              [class.sort-direction--visible]="isSortActive(opt.id)"
              role="button"
              tabindex="0"
              (click)="toggleSort(opt.id); $event.stopPropagation()"
              (keydown.enter)="toggleSort(opt.id); $event.stopPropagation()"
              [attr.aria-label]="'Sort ' + getDirectionLabel(opt.id)"
            >
              <span class="sort-direction__state-current">{{ getDirectionSymbol(opt.id) }}</span>
              <span class="sort-direction__state-next">{{ getNextDirectionSymbol(opt.id) }}</span>
            </span>
          </button>
        }
        @if (filteredOptions().length === 0 && groupedOptions().length === 0) {
          <div class="dd-empty">No matching properties</div>
        }
      </div>
    </div>
  `,
  styleUrl: './sort-dropdown.component.scss',
})
export class SortDropdownComponent {
  private readonly viewService = inject(WorkspaceViewService);
  private readonly registry = inject(PropertyRegistryService);

  readonly optionsInput = input<SortDropdownOption[] | null>(null);
  readonly groupingIdsInput = input<string[] | null>(null);
  readonly activeSortsInput = input<SortConfig[] | null>(null);
  readonly defaultSorts = input<SortConfig[]>([{ key: 'date-captured', direction: 'desc' }]);

  /** Sort options derived from the property registry (only sortable properties). */
  private readonly options = computed<SortDropdownOption[]>(() => {
    const provided = this.optionsInput();
    if (provided) return provided;

    return this.registry.sortableProperties().map((p) => ({
      id: p.id,
      label: p.label,
      icon: p.icon,
      defaultDirection: p.defaultSortDirection,
    }));
  });

  readonly searchTerm = signal('');
  readonly activeSorts = signal<SortConfig[]>([]);
  readonly sortChanged = output<SortConfig[]>();

  /** IDs of properties currently used as groupings. */
  private readonly groupingIds = computed(() => {
    const provided = this.groupingIdsInput();
    if (provided) return provided;
    return this.viewService.activeGroupings().map((g) => g.id);
  });

  /** Options in the "Sorted by grouping" section — match grouping order, filtered by search. */
  readonly groupedOptions = computed(() => {
    const ids = this.groupingIds();
    const term = this.searchTerm().toLowerCase();
    const opts = this.options();
    return ids
      .map((id) => opts.find((o) => o.id === id))
      .filter((o): o is SortDropdownOption => !!o)
      .filter((o) => !term || o.label.toLowerCase().includes(term));
  });

  /** Remaining options not in the grouping section, filtered by search. */
  readonly filteredOptions = computed(() => {
    const groupedIds = new Set(this.groupingIds());
    const term = this.searchTerm().toLowerCase();
    return this.options()
      .filter((o) => !groupedIds.has(o.id))
      .filter((o) => !term || o.label.toLowerCase().includes(term));
  });

  readonly hasCustomSort = computed(() => {
    const sorts = this.activeSorts();
    const defaults = this.defaultSorts();
    return !this.areSortsEqual(sorts, defaults);
  });

  constructor() {
    effect(() => {
      const provided = this.activeSortsInput();
      if (provided) {
        this.activeSorts.set([...provided]);
        return;
      }

      this.activeSorts.set([...this.viewService.effectiveSorts()]);
    });
  }

  isSortActive(id: string): boolean {
    return this.activeSorts().some((s) => s.key === id);
  }

  getDirectionSymbol(id: string): string {
    const sort = this.activeSorts().find((s) => s.key === id);
    if (!sort) return '–';
    return sort.direction === 'asc' ? '↑' : '↓';
  }

  /** Returns the symbol for the state that will result from the next click. */
  getNextDirectionSymbol(id: string): string {
    const sort = this.activeSorts().find((s) => s.key === id);
    if (!sort) return '↑'; // Deactivated → Ascending
    if (sort.direction === 'asc') return '↓'; // Ascending → Descending
    return '–'; // Descending → Deactivated
  }

  getDirectionLabel(id: string): string {
    const sort = this.activeSorts().find((s) => s.key === id);
    if (!sort) return 'inactive';
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }

  /** Toggle sort: all items cycle deactivated → ascending → descending → deactivated. */
  toggleSort(id: string): void {
    const current = this.activeSorts();
    const existing = current.find((s) => s.key === id);

    let next: SortConfig[];
    if (!existing) {
      // Deactivated → Ascending
      next = [...current, { key: id, direction: 'asc' }];
    } else if (existing.direction === 'asc') {
      // Ascending → Descending
      next = current.map((s) => (s.key === id ? { ...s, direction: 'desc' as const } : s));
    } else {
      // Descending → Deactivated
      next = current.filter((s) => s.key !== id);
    }

    this.activeSorts.set(next);
    this.sortChanged.emit(next);
  }

  resetSort(): void {
    const defaultSorts = [...this.defaultSorts()];
    this.activeSorts.set(defaultSorts);
    this.sortChanged.emit(defaultSorts);
  }

  private areSortsEqual(left: SortConfig[], right: SortConfig[]): boolean {
    if (left.length !== right.length) return false;

    for (let i = 0; i < left.length; i++) {
      if (left[i].key !== right[i].key || left[i].direction !== right[i].direction) {
        return false;
      }
    }

    return true;
  }
}
