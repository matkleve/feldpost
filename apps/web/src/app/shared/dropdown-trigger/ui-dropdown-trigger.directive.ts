// TODO(spartan-v4): Replace with spartan menu trigger + helm when Tailwind v4 peers allow.
// TODO(brn-menu): No `BrnMenuTrigger` in `@spartan-ng/brain` alpha.691 — keep toolbar trigger chrome here.
// @see docs/MIGRATION_PLAN.md

/**
 * Trigger styling for toolbar/menu buttons that open a floating shell.
 *
 * NAMING NOTE: Pairs with `DropdownShellComponent`, which is semantically a *popover
 * shell* (fixed pixel anchor, arbitrary content). See that component’s JSDoc for
 * rename/TODO and `apps/web/src/app/shared/ui/menu/` for local hlm menu shims.
 *
 * `menuItemVariants()` is merged so focus/hover tokens stay aligned with `[hlmMenuItem]`
 * rows inside the shell. Legacy pattern hook `.dropdown-item` stays on the host for
 * `styles/patterns/dropdown.scss` extensions (`.dropdown-section` is used on section
 * headings via `hlmMenuLabel` + `dd-section-label` in dropdown templates).
 */
import { computed, Directive, input } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { menuItemVariants } from '../ui/menu/menu-variants';

@Directive({
  selector: 'button[uiDropdownTrigger], a[uiDropdownTrigger]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class UiDropdownTriggerDirective {
  readonly size = input<'sm' | 'md' | 'lg'>('sm');
  readonly open = input(false);
  readonly collapse = input<'compact' | 'icon-only' | null>(null);

  protected readonly hostClass = computed(() => {
    const parts: string[] = [
      menuItemVariants(),
      'ui-button ui-dropdown-trigger dropdown-item',
    ];
    const size = this.size();
    if (size === 'sm') parts.push('ui-button--sm');
    if (size === 'md') parts.push('ui-button--md');
    if (size === 'lg') parts.push('ui-button--lg');
    if (this.open()) parts.push('ui-dropdown-trigger--open');
    const collapse = this.collapse();
    if (collapse === 'compact') parts.push('ui-dropdown-trigger--compact');
    if (collapse === 'icon-only') parts.push('ui-dropdown-trigger--icon-only');
    return twMerge(...parts);
  });
}
