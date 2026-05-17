import { Directive } from '@angular/core';

/**
 * Marks a projected toolbar-menu search-row control so `StandardDropdownComponent` can detect presence vs empty slot.
 * @see docs/specs/component/filters/dropdown-system.md
 */
@Directive({
  selector: '[dropdown-search-action]',
  standalone: true,
})
export class DropdownSearchActionAnchorDirective {}
