import { Component, computed, inject, output, signal } from '@angular/core';
import { WorkspaceViewService } from '../../../../core/workspace-view.service';
import type { SortConfig } from '../../../../core/workspace-view.types';

type SortOption = {
  id: string;
  label: string;
  icon: string;
  defaultDirection: 'asc' | 'desc';
  /** When false, only the default direction is available (bi-state: active ↔ inactive). */
  bidirectional: boolean;
};

@Component({
  selector: 'app-sort-dropdown',
  template: `
    <div class="sort-dropdown">
      <div class="sort-search">
        <input
          class="sort-search__input"
          type="text"
          placeholder="Search properties…"
          [value]="searchTerm()"
          (input)="searchTerm.set($any($event.target).value)"
        />
        @if (searchTerm()) {
          <button class="sort-search__clear" (click)="searchTerm.set('')" aria-label="Clear search">
            <span class="material-icons">close</span>
          </button>
        }
      </div>
      <div class="sort-options">
        @if (hasCustomSort()) {
          <button class="sort-reset" (click)="resetSort()">
            <span class="material-icons sort-reset__icon" aria-hidden="true">restart_alt</span>
            <span>Reset to default</span>
          </button>
        }
        @if (groupedOptions().length > 0) {
          <div class="sort-section-label">Sorted by grouping</div>
          @for (opt of groupedOptions(); track opt.id) {
            <button
              class="sort-option sort-option--active"
              (click)="toggleSort(opt.id); $event.stopPropagation()"
            >
              <span class="material-icons sort-option__icon" aria-hidden="true">{{
                opt.icon
              }}</span>
              <span class="sort-option__label">{{ opt.label }}</span>
              <span
                class="sort-option__direction sort-option__direction--visible"
                role="button"
                tabindex="0"
                (click)="toggleSort(opt.id); $event.stopPropagation()"
                (keydown.enter)="toggleSort(opt.id); $event.stopPropagation()"
                [attr.aria-label]="'Sort ' + getDirectionLabel(opt.id)"
              >
                <span class="sort-option__state-current">{{ getDirectionSymbol(opt.id) }}</span>
                <span class="sort-option__state-next">{{ getNextDirectionSymbol(opt.id) }}</span>
              </span>
            </button>
          }
          <div class="sort-divider"></div>
        }
        @for (opt of filteredOptions(); track opt.id) {
          <button
            class="sort-option"
            [class.sort-option--active]="isSortActive(opt.id)"
            (click)="toggleSort(opt.id); $event.stopPropagation()"
          >
            <span class="material-icons sort-option__icon" aria-hidden="true">{{ opt.icon }}</span>
            <span class="sort-option__label">{{ opt.label }}</span>
            <span
              class="sort-option__direction"
              [class.sort-option__direction--visible]="isSortActive(opt.id)"
              role="button"
              tabindex="0"
              (click)="toggleSort(opt.id); $event.stopPropagation()"
              (keydown.enter)="toggleSort(opt.id); $event.stopPropagation()"
              [attr.aria-label]="'Sort ' + getDirectionLabel(opt.id)"
            >
              <span class="sort-option__state-current">{{ getDirectionSymbol(opt.id) }}</span>
              <span class="sort-option__state-next">{{ getNextDirectionSymbol(opt.id) }}</span>
            </span>
          </button>
        }
      </div>
    </div>
  `,
  styleUrl: './sort-dropdown.component.scss',
})
export class SortDropdownComponent {
  private readonly viewService = inject(WorkspaceViewService);

  private readonly options: SortOption[] = [
    {
      id: 'date-captured',
      label: 'Date captured',
      icon: 'schedule',
      defaultDirection: 'desc',
      bidirectional: false,
    },
    {
      id: 'date-uploaded',
      label: 'Date uploaded',
      icon: 'cloud_upload',
      defaultDirection: 'desc',
      bidirectional: false,
    },
    {
      id: 'name',
      label: 'Name',
      icon: 'sort_by_alpha',
      defaultDirection: 'asc',
      bidirectional: true,
    },
    {
      id: 'distance',
      label: 'Distance',
      icon: 'straighten',
      defaultDirection: 'asc',
      bidirectional: false,
    },
    {
      id: 'address',
      label: 'Address',
      icon: 'location_on',
      defaultDirection: 'asc',
      bidirectional: true,
    },
    {
      id: 'city',
      label: 'City',
      icon: 'location_city',
      defaultDirection: 'asc',
      bidirectional: true,
    },
    { id: 'country', label: 'Country', icon: 'flag', defaultDirection: 'asc', bidirectional: true },
    {
      id: 'project',
      label: 'Project',
      icon: 'folder',
      defaultDirection: 'asc',
      bidirectional: true,
    },
  ];

  readonly searchTerm = signal('');
  readonly activeSorts = signal<SortConfig[]>([...this.viewService.activeSorts()]);
  readonly sortChanged = output<SortConfig[]>();

  /** IDs of properties currently used as groupings. */
  private readonly groupingIds = computed(() =>
    this.viewService.activeGroupings().map((g) => g.id),
  );

  /** Options in the "Sorted by grouping" section — match grouping order, filtered by search. */
  readonly groupedOptions = computed(() => {
    const ids = this.groupingIds();
    const term = this.searchTerm().toLowerCase();
    return ids
      .map((id) => this.options.find((o) => o.id === id))
      .filter((o): o is SortOption => !!o)
      .filter((o) => !term || o.label.toLowerCase().includes(term));
  });

  /** Remaining options not in the grouping section, filtered by search. */
  readonly filteredOptions = computed(() => {
    const groupedIds = new Set(this.groupingIds());
    const term = this.searchTerm().toLowerCase();
    return this.options
      .filter((o) => !groupedIds.has(o.id))
      .filter((o) => !term || o.label.toLowerCase().includes(term));
  });

  readonly hasCustomSort = computed(() => {
    const sorts = this.activeSorts();
    return sorts.length !== 1 || sorts[0].key !== 'date-captured' || sorts[0].direction !== 'desc';
  });

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
    const opt = this.options.find((o) => o.id === id);
    if (!opt) return '–';

    if (!sort) {
      // Inactive → will activate with default direction
      return opt.defaultDirection === 'asc' ? '↑' : '↓';
    }
    if (!opt.bidirectional) {
      // Unidirectional: active → will deactivate
      return '–';
    }
    if (sort.direction === opt.defaultDirection) {
      // Bidirectional at default dir → will flip to opposite
      return opt.defaultDirection === 'asc' ? '↓' : '↑';
    }
    // Bidirectional at opposite dir → will deactivate
    return '–';
  }

  getDirectionLabel(id: string): string {
    const sort = this.activeSorts().find((s) => s.key === id);
    if (!sort) return 'inactive';
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }

  /** Toggle sort: bidirectional items cycle inactive → default → opposite → inactive; unidirectional items toggle inactive ↔ default. */
  toggleSort(id: string): void {
    const current = this.activeSorts();
    const existing = current.find((s) => s.key === id);
    const opt = this.options.find((o) => o.id === id);
    if (!opt) return;

    const opposite = (d: 'asc' | 'desc'): 'asc' | 'desc' => (d === 'asc' ? 'desc' : 'asc');
    let next: SortConfig[];
    if (!existing) {
      // Inactive → activate with default direction
      next = [...current, { key: id, direction: opt.defaultDirection }];
    } else if (opt.bidirectional && existing.direction === opt.defaultDirection) {
      // Default dir → opposite dir (bidirectional only)
      next = current.map((s) =>
        s.key === id ? { ...s, direction: opposite(opt.defaultDirection) } : s,
      );
    } else {
      // Deactivate (remove)
      next = current.filter((s) => s.key !== id);
    }

    this.activeSorts.set(next);
    this.sortChanged.emit(next);
  }

  resetSort(): void {
    const defaultSorts: SortConfig[] = [{ key: 'date-captured', direction: 'desc' }];
    this.activeSorts.set(defaultSorts);
    this.sortChanged.emit(defaultSorts);
  }
}
