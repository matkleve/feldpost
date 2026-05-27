import { Component, contentChildren, input, output } from '@angular/core';
import { HLM_BUTTON_IMPORTS } from '../ui/button';
import { DropdownSearchActionAnchorDirective } from '../dropdown-trigger/dropdown-search-action-anchor.directive';

/**
 * Toolbar menu search row — field + fixed icon slots (clear + projected actions).
 * @see docs/specs/component/ui-primitives/menu-panel-search-row.md
 */
@Component({
  selector: 'app-menu-panel-search-row',
  standalone: true,
  imports: [...HLM_BUTTON_IMPORTS],
  templateUrl: './menu-panel-search-row.component.html',
  styleUrl: './menu-panel-search-row.component.scss',
  host: {
    class: 'standard-dropdown__search min-h-tap-lg min-w-0 shrink-0 border-b border-border px-0 py-2 md:min-h-tap',
  },
})
export class MenuPanelSearchRowComponent {
  readonly reserveProjectedSearchActionSlot = input(false);
  readonly projectedSearchActions = contentChildren(DropdownSearchActionAnchorDirective);

  readonly searchPlaceholder = input('Search...');
  readonly searchTerm = input('');
  readonly showDefaultClearAction = input(true);
  readonly clearSearchAriaLabel = input('Clear search');

  readonly searchTermChange = output<string>();
  readonly clearRequested = output<void>();
}
