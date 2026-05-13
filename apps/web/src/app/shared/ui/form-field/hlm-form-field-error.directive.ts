// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-form-field-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { computed, Directive } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { formFieldErrorVariants } from './form-field-variants';

/**
 * Error message styling inside `hlm-form-field`.
 * @see docs/MIGRATION_PLAN.md
 */
@Directive({
  selector: '[hlmFormFieldError]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmFormFieldErrorDirective {
  protected readonly hostClass = computed(() => twMerge(formFieldErrorVariants()));
}
