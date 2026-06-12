import { Component, input, output } from '@angular/core';
import { MenuPanelFooterActionComponent } from '../../menu-panel/menu-panel-footer-action.component';
import { MenuPanelSearchRowComponent } from '../../menu-panel/menu-panel-search-row.component';
import {
  menuPanelScrollHostClasses,
  menuPanelScrollOverflowClasses,
  type MenuPanelScrollMode,
} from '../../menu-panel/menu-panel-scroll-mode';

@Component({
  selector: 'app-standard-dropdown',
  standalone: true,
  imports: [MenuPanelSearchRowComponent, MenuPanelFooterActionComponent],
  templateUrl: './standard-dropdown.component.html',
  styleUrl: './standard-dropdown.component.scss',
  host: {
    class: 'standard-dropdown flex min-h-0 flex-1 flex-col gap-y-1',
  },
})
export class StandardDropdownComponent {
  /** When true, keeps a trailing icon slot when no `[dropdown-search-action]` is projected (e.g. sort reset). */
  readonly reserveProjectedSearchActionSlot = input(false);

  readonly showSearch = input(true);
  readonly searchPlaceholder = input('Search...');
  readonly searchTerm = input('');
  readonly showDefaultClearAction = input(true);
  readonly clearSearchAriaLabel = input('Clear search');

  /** Prefer over raw `itemsClass` scroll modifier strings. */
  readonly scrollMode = input<MenuPanelScrollMode>('host');
  /** Extra classes on the scroll host (non-scroll concerns only). */
  readonly itemsClass = input('');

  readonly actionLabel = input<string | null>(null);
  readonly actionIcon = input('add');

  readonly searchTermChange = output<string>();
  readonly clearRequested = output<void>();
  readonly actionRequested = output<void>();
  /** Emits when the items host scrolls (toolbar filter uses this to dismiss inline pickers). */
  readonly itemsScroll = output<void>();

  /** Scroll host for `[dropdown-items]` — single ng-content site (no nested re-projection). */
  itemsHostClass(): string {
    const mode = this.scrollMode();
    const host = menuPanelScrollHostClasses(mode, this.itemsClass().trim());
    const overflow = menuPanelScrollOverflowClasses(mode);
    return `${host} ${overflow}`.replace(/\s+/g, ' ').trim();
  }
}
