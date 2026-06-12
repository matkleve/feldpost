// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-form-field-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { computed, Directive } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { formFieldHintVariants } from './form-field-variants';

/**
 * Hint / helper text styling inside `hlm-form-field`.
 * @see docs/MIGRATION_PLAN.md
 */
@Directive({
  selector: '[hlmFormFieldHint]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmFormFieldHintDirective {
  protected readonly hostClass = computed(() => twMerge(formFieldHintVariants()));
}
