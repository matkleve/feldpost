import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import type { SearchFilterChip } from '../../../core/search/search.models';

@Component({
  selector: 'ss-search-filter-chips',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (chips().length > 0) {
      <div class="search-filter-chips" role="list" aria-label="Active search filters">
        @for (chip of chips(); track chip.id) {
          <button
            class="search-filter-chips__chip"
            type="button"
            role="listitem"
            [attr.aria-label]="'Remove filter ' + chip.label"
            (click)="removeChip.emit(chip)"
          >
            <span class="material-icons search-filter-chips__icon" aria-hidden="true">workspaces</span>
            <span class="search-filter-chips__label">{{ chip.label }}</span>
            <span class="material-icons search-filter-chips__close" aria-hidden="true">close</span>
          </button>
        }
      </div>
    }
  `,
  styles: `
    .search-filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-1);
      padding: var(--spacing-1) var(--spacing-2) 0;
    }

    .search-filter-chips__chip {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-1);
      min-height: 1.75rem;
      padding: 0 var(--spacing-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-full);
      background: var(--background);
      color: var(--foreground);
      font-size: 0.8125rem;
      line-height: 1.2;
      cursor: pointer;
    }

    .search-filter-chips__icon,
    .search-filter-chips__close {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }

    .search-filter-chips__label {
      max-width: 12rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class SearchFilterChipsComponent {
  readonly chips = input<SearchFilterChip[]>([]);
  readonly removeChip = output<SearchFilterChip>();
}
