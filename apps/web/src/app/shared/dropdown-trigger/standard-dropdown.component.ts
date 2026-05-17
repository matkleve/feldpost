import { Component, input, output } from '@angular/core';
import { HlmMenuItemDirective } from '../ui/menu';
import { HLM_BUTTON_IMPORTS } from '../ui/button';

@Component({
  selector: 'app-standard-dropdown',
  standalone: true,
  imports: [...HLM_BUTTON_IMPORTS, HlmMenuItemDirective],
  templateUrl: './standard-dropdown.component.html',
  styleUrl: './standard-dropdown.component.scss',
})
export class StandardDropdownComponent {
  readonly showSearch = input(true);
  readonly searchPlaceholder = input('Search...');
  readonly searchTerm = input('');
  readonly showDefaultClearAction = input(true);
  readonly clearSearchAriaLabel = input('Clear search');
  readonly itemsClass = input('');

  readonly actionLabel = input<string | null>(null);
  readonly actionIcon = input('add');

  readonly searchTermChange = output<string>();
  readonly clearRequested = output<void>();
  readonly actionRequested = output<void>();

  itemsHostClass(): string {
    const extra = this.itemsClass().trim();
    // When a footer action exists, bottom padding moves to the footer row so the scroll list does not double-stack vertical inset.
    // @see docs/specs/component/filters/dropdown-system.md
    const verticalPad = this.actionLabel() ? 'pt-2 pb-0' : 'py-2';
    const base = `standard-dropdown__items flex flex-1 flex-col gap-0 ${verticalPad} min-h-0 overflow-y-auto overflow-x-hidden`;
    return extra ? `${base} ${extra}` : base;
  }
}
