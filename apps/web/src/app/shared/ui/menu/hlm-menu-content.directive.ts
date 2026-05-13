// TODO(spartan-v4): Replace with @spartan-ng/ui-menu-helm when Tailwind v4 peers allow.
// TODO(brn-menu): No `BrnMenu` in current `@spartan-ng/brain` pin — styling-only shim.
// @see docs/MIGRATION_PLAN.md

import { computed, Directive, input } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { menuContentVariants } from './menu-variants';

@Directive({
  selector: '[hlmMenuContent]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmMenuContentDirective {
  readonly userClass = input<string>('', { alias: 'class' });

  protected readonly hostClass = computed(() => twMerge(menuContentVariants(), this.userClass()));
}
