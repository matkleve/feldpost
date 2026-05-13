// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-toast-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { computed, Directive, input } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { toastVariants, type ToastVariants } from './toast-variants';

type ToastVariant = NonNullable<ToastVariants['variant']>;

/**
 * Toast surface styling; opt-in via `hlmToast`.
 * @see docs/MIGRATION_PLAN.md
 */
@Directive({
  selector: '[hlmToast]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmToastDirective {
  readonly variant = input<ToastVariant>('default');

  protected readonly hostClass = computed(() =>
    twMerge(toastVariants({ variant: this.variant() })),
  );
}
