// TODO(spartan-v4): Replace with @spartan-ng/ui-menu-helm when Tailwind v4 peers allow.
// TODO(brn-menu): No `BrnMenuItem` in brain — styling-only shim for dropdown rows.
// @see docs/MIGRATION_PLAN.md

import { computed, Directive, input } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { menuItemVariants } from './menu-variants';

@Directive({
  selector: '[hlmMenuItem]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmMenuItemDirective {
  readonly userClass = input<string>('', { alias: 'class' });

  protected readonly hostClass = computed(() => twMerge(menuItemVariants(), this.userClass()));
}
