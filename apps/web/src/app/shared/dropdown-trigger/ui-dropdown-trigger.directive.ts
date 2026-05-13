/**
 * Trigger styling for toolbar/menu buttons that open a floating shell.
 *
 * NAMING NOTE: Pairs with `DropdownShellComponent`, which is semantically a *popover
 * shell* (fixed pixel anchor, arbitrary content). See that component’s JSDoc for
 * rename/TODO and `apps/web/src/app/shared/ui/popover/` for the local hlm surface shim.
 */
import { Directive, input } from '@angular/core';

@Directive({
  selector: 'button[uiDropdownTrigger], a[uiDropdownTrigger]',
  standalone: true,
  host: {
    'class': 'ui-button ui-dropdown-trigger',
    '[class.ui-button--sm]': 'size() === "sm"',
    '[class.ui-button--md]': 'size() === "md"',
    '[class.ui-button--lg]': 'size() === "lg"',
    '[class.ui-dropdown-trigger--open]': 'open()',
    '[class.ui-dropdown-trigger--compact]': 'collapse() === "compact"',
    '[class.ui-dropdown-trigger--icon-only]': 'collapse() === "icon-only"',
  },
})
export class UiDropdownTriggerDirective {
  readonly size = input<'sm' | 'md' | 'lg'>('sm');
  readonly open = input(false);
  readonly collapse = input<'compact' | 'icon-only' | null>(null);
}
