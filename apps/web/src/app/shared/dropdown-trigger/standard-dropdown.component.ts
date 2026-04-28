import { Component, input, output } from '@angular/core';
import { UiIconButtonGhostDirective } from '../ui-primitives/ui-primitives.directive';

@Component({
  selector: 'app-standard-dropdown',
  standalone: true,
  imports: [UiIconButtonGhostDirective],
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
    return extra ? `dd-items ${extra}` : 'dd-items';
  }
}
