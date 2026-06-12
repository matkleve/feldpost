// TODO(spartan-v4): Replace with @spartan-ng/ui-popover-helm when Tailwind v4 peers allow.
// @see docs/MIGRATION_PLAN.md

import { computed, Directive, input } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { popoverVariants } from './popover-variants';

/**
 * Floating panel chrome for popover/dropdown shells (positioning is caller-owned).
 */
@Directive({
  selector: '[hlmPopover]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmPopoverDirective {
  readonly userClass = input<string>('', { alias: 'class' });

  protected readonly hostClass = computed(() =>
    twMerge(popoverVariants(), this.userClass()),
  );
}
