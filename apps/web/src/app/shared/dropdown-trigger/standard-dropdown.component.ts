import { Component, contentChildren, input, output } from '@angular/core';
import { HlmMenuItemDirective } from '../ui/menu';
import { HLM_BUTTON_IMPORTS } from '../ui/button';
import { DropdownSearchActionAnchorDirective } from './dropdown-search-action-anchor.directive';

@Component({
  selector: 'app-standard-dropdown',
  standalone: true,
  imports: [...HLM_BUTTON_IMPORTS, HlmMenuItemDirective],
  templateUrl: './standard-dropdown.component.html',
  styleUrl: './standard-dropdown.component.scss',
  host: {
    class: 'standard-dropdown flex min-h-0 flex-1 flex-col gap-y-2',
  },
})
export class StandardDropdownComponent {
  /** When true, keeps a trailing icon slot when no `[dropdown-search-action]` is projected (e.g. sort reset). */
  readonly reserveProjectedSearchActionSlot = input(false);

  /** Projected `[dropdown-search-action]` anchors — exposed for template slot layout. */
  readonly projectedSearchActions = contentChildren(DropdownSearchActionAnchorDirective);

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
  /** Emits when the items host scrolls (toolbar filter uses this to dismiss inline pickers). */
  readonly itemsScroll = output<void>();

  itemsHostClass(): string {
    const extra = this.itemsClass().trim();
    const delegateScroll = extra.includes('scrollbar-gutter-delegate');
    // Scroll list: one owner — items host, or inner band (e.g. `.projects-list`) when delegate modifier is set.
    // @see docs/specs/component/filters/dropdown-system.md#toolbar-menu-panels-anchored-ui
    const overflow = delegateScroll
      ? 'overflow-x-hidden overflow-y-hidden'
      : 'overflow-y-auto overflow-x-hidden';
    const base = `standard-dropdown__items flex flex-1 flex-col py-0 min-h-0 ${overflow}`;
    return extra ? `${base} ${extra}` : base;
  }
}
