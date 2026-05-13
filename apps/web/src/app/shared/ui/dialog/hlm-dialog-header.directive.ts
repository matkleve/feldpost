// TODO(spartan-v4): Replace with @spartan-ng/ui-dialog-helm when Tailwind v4 peers allow.
// @see docs/MIGRATION_PLAN.md

import { computed, Directive } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { dialogHeaderVariants } from './dialog-variants';

@Directive({
  selector: '[hlmDialogHeader]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmDialogHeaderDirective {
  protected readonly hostClass = computed(() => twMerge(dialogHeaderVariants()));
}
