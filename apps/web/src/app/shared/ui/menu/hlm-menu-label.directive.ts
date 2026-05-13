// TODO(spartan-v4): Replace with @spartan-ng/ui-menu-helm when Tailwind v4 peers allow.
// TODO(brn-menu): Styling-only shim.
// @see docs/MIGRATION_PLAN.md

import { computed, Directive, input } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { menuLabelVariants } from './menu-variants';

@Directive({
  selector: '[hlmMenuLabel]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmMenuLabelDirective {
  readonly userClass = input<string>('', { alias: 'class' });

  protected readonly hostClass = computed(() => twMerge(menuLabelVariants(), this.userClass()));
}
