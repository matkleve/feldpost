// TODO(spartan-v4): Replace with @spartan-ng/ui-dialog-helm when Tailwind v4 peers allow.
// @see docs/MIGRATION_PLAN.md

import { computed, Directive, input } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { dialogContentVariants } from './dialog-variants';

/**
 * Dialog panel surface inside `ng-template brnDialogContent` (or nested panel root).
 */
@Directive({
  selector: '[hlmDialogContent]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmDialogContentDirective {
  readonly userClass = input<string>('', { alias: 'class' });

  protected readonly hostClass = computed(() =>
    twMerge(dialogContentVariants(), this.userClass()),
  );
}
