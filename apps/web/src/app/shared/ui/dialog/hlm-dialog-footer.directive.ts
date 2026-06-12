// TODO(spartan-v4): Replace with @spartan-ng/ui-dialog-helm when Tailwind v4 peers allow.
// @see docs/MIGRATION_PLAN.md

import { computed, Directive } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { dialogFooterVariants } from './dialog-variants';

@Directive({
  selector: '[hlmDialogFooter]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmDialogFooterDirective {
  protected readonly hostClass = computed(() => twMerge(dialogFooterVariants()));
}
