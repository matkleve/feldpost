import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { WorkspaceViewService } from '../../core/workspace-view.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { PropertyRegistryService } from '../../core/property-registry.service';
import type { SortConfig } from '../../core/workspace-view.types';
import { StandardDropdownComponent } from './standard-dropdown.component';

export type SortDropdownOption = {
  id: string;
  label: string;
  icon: string;
  defaultDirection: 'asc' | 'desc';
};

@Component({
  selector: 'app-sort-dropdown',
  template: `
    <app-standard-dropdown
      class="sort-dropdown"
      [searchTerm]="searchTerm()"
      [searchPlaceholder]="t('workspace.sort.search.placeholder', 'Search properties...')"
      [showDefaultClearAction]="false"
      (searchTermChange)="searchTerm.set($event)"
      (clearRequested)="searchTerm.set('')"
    >
      @if (searchTerm() || hasCustomSort()) {
        <button
          dropdown-search-action
          class="dd-search__action icon-btn-ghost"
          type="button"
          (click)="onSearchActionClick()"
          [attr.aria-label]="searchActionAriaLabel()"
        >
          <span class="material-icons" aria-hidden="true">{{ searchActionIcon() }}</span>
        </button>
      }

      <div dropdown-items>
        @if (groupedOptions().length > 0) {
          <div class="dd-section-label">
            {{ t('workspace.sort.section.groupedBy', 'Sorted by grouping') }}
          </div>
          @for (opt of groupedOptions(); track opt.id) {
            <button
              class="dd-item dd-item--active"
              type="button"
              [class.dd-item--hovered]="isRowHovered(opt.id)"
              (mouseenter)="setHoveredSort(opt.id)"
              (mouseleave)="clearHoveredSort(opt.id)"
              (focus)="setHoveredSort(opt.id)"
              (blur)="clearHoveredSort(opt.id)"
              (click)="toggleSort(opt.id); $event.stopPropagation()"
            >
              <span class="material-icons dd-item__icon" aria-hidden="true">{{ opt.icon }}</span>
              <span class="dd-item__label">{{ opt.label }}</span>
              <span
                class="sort-direction sort-direction--visible"
                [attr.data-current-symbol]="getDirectionSymbol(opt.id)"
                [attr.data-next-symbol]="getNextDirectionSymbol(opt.id)"
                [class.sort-direction--preview]="isRowHovered(opt.id)"
                aria-hidden="true"
                [textContent]="getDisplayedDirectionSymbol(opt.id)"
              ></span>
            </button>
          }
          <div class="dd-divider"></div>
        }
        @for (opt of filteredOptions(); track opt.id) {
          <button
            class="dd-item"
            type="button"
            [class.dd-item--active]="isSortActive(opt.id)"
            [class.dd-item--hovered]="isRowHovered(opt.id)"
            (mouseenter)="setHoveredSort(opt.id)"
            (mouseleave)="clearHoveredSort(opt.id)"
            (focus)="setHoveredSort(opt.id)"
            (blur)="clearHoveredSort(opt.id)"
            (click)="toggleSort(opt.id); $event.stopPropagation()"
          >
            <span class="material-icons dd-item__icon" aria-hidden="true">{{ opt.icon }}</span>
            <span class="dd-item__label">{{ opt.label }}</span>
            <span
              class="sort-direction"
              [class.sort-direction--visible]="isSortActive(opt.id)"
              [attr.data-current-symbol]="getDirectionSymbol(opt.id)"
              [attr.data-next-symbol]="getNextDirectionSymbol(opt.id)"
              [class.sort-direction--preview]="isRowHovered(opt.id)"
              aria-hidden="true"
              [textContent]="getDisplayedDirectionSymbol(opt.id)"
            ></span>
          </button>
        }
        @if (filteredOptions().length === 0 && groupedOptions().length === 0) {
          <div class="dd-empty">
            {{ t('workspace.sort.empty.noMatchingProperties', 'No matching properties') }}
          </div>
        }
      </div>
    </app-standard-dropdown>
  `,
  styleUrl: './sort-dropdown.component.scss',
  imports: [StandardDropdownComponent],
})
export class SortDropdownComponent {
  private readonly inactiveSymbol = '\u2013';
  private readonly ascendingSymbol = '\u2191';
  private readonly descendingSymbol = '\u2193';

  private readonly viewService = inject(WorkspaceViewService);
  private readonly i18nService = inject(I18nService);
  private readonly registry = inject(PropertyRegistryService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly optionsInput = input<SortDropdownOption[] | null>(null);
  readonly groupingIdsInput = input<string[] | null>(null);
  readonly activeSortsInput = input<SortConfig[] | null>(null);
  readonly defaultSorts = input<SortConfig[]>([{ key: 'date-captured', direction: 'desc' }]);

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
  readonly hoveredSortId = signal<string | null>(null);
  readonly sortChanged = output<SortConfig[]>();

  private readonly groupingIds = computed(() => {
    const provided = this.groupingIdsInput();
    if (provided) return provided;
    return this.viewService.activeGroupings().map((g) => g.id);
  });

  readonly groupedOptions = computed(() => {
    const ids = this.groupingIds();
    const term = this.searchTerm().toLowerCase();
    const opts = this.options();
    return ids
      .map((id) => opts.find((o) => o.id === id))
      .filter((o): o is SortDropdownOption => !!o)
      .filter((o) => !term || o.label.toLowerCase().includes(term));
  });

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

  readonly searchActionIcon = computed(() => (this.searchTerm() ? 'close' : 'restart_alt'));
  readonly searchActionAriaLabel = computed(() =>
    this.searchTerm()
      ? this.t('workspace.sort.search.clear', 'Clear search')
      : this.t('workspace.sort.search.resetDefault', 'Reset to default'),
  );

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

  isRowHovered(id: string): boolean {
    return this.hoveredSortId() === id;
  }

  getDirectionSymbol(id: string): string {
    const sort = this.activeSorts().find((s) => s.key === id);
    if (!sort) return this.inactiveSymbol;
    return sort.direction === 'asc' ? this.ascendingSymbol : this.descendingSymbol;
  }

  getNextDirectionSymbol(id: string): string {
    const sort = this.activeSorts().find((s) => s.key === id);
    if (!sort) return this.ascendingSymbol;
    if (sort.direction === 'asc') return this.descendingSymbol;
    return this.inactiveSymbol;
  }

  getDirectionLabel(id: string): string {
    const sort = this.activeSorts().find((s) => s.key === id);
    if (!sort) return this.t('workspace.sort.direction.inactive', 'inactive');
    return sort.direction === 'asc'
      ? this.t('workspace.sort.direction.ascending', 'ascending')
      : this.t('workspace.sort.direction.descending', 'descending');
  }

  getDisplayedDirectionSymbol(id: string): string {
    return this.isRowHovered(id) ? this.getNextDirectionSymbol(id) : this.getDirectionSymbol(id);
  }

  toggleSort(id: string): void {
    const current = this.activeSorts();
    const existing = current.find((s) => s.key === id);
    const defaultDirection = this.getDefaultDirection(id);

    let next: SortConfig[];
    if (!existing) {
      next = [...current, { key: id, direction: defaultDirection }];
    } else if (existing.direction === 'asc') {
      next = current.map((s) => (s.key === id ? { ...s, direction: 'desc' as const } : s));
    } else {
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

  onSearchActionClick(): void {
    if (this.searchTerm()) {
      this.searchTerm.set('');
      return;
    }

    if (this.hasCustomSort()) {
      this.resetSort();
    }
  }

  setHoveredSort(id: string): void {
    this.hoveredSortId.set(id);
  }

  clearHoveredSort(id: string): void {
    if (this.hoveredSortId() === id) {
      this.hoveredSortId.set(null);
    }
  }

  private getDefaultDirection(id: string): 'asc' | 'desc' {
    return this.options().find((option) => option.id === id)?.defaultDirection ?? 'asc';
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
