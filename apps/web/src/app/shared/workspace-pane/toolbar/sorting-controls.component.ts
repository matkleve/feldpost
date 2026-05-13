import { Component, signal } from '@angular/core';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';

type SortOption = 'date-desc' | 'date-asc' | 'distance' | 'name';

@Component({
  selector: 'app-sorting-controls',
  imports: [...HLM_BUTTON_IMPORTS],
  template: `
    <div class="sorting-controls">
      @for (opt of options; track opt.value) {
        <button
          hlmBtn
          variant="ghost"
          size="sm"
          class="sorting-controls__btn"
          [class.sorting-controls__btn--active]="opt.value === activeSort()"
          (click)="activeSort.set(opt.value)"
        >
          {{ opt.label }}
        </button>
      }
    </div>
  `,
  styleUrl: './sorting-controls.component.scss',
})
export class SortingControlsComponent {
  readonly activeSort = signal<SortOption>('date-desc');
  readonly options: { value: SortOption; label: string }[] = [
    { value: 'date-desc', label: 'Date ↓' },
    { value: 'date-asc', label: 'Date ↑' },
    { value: 'distance', label: 'Distance' },
    { value: 'name', label: 'Name' },
  ];
}

