// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-input-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { booleanAttribute, computed, Directive, input } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { inputVariants } from './input-variants';

/**
 * Native input/textarea styling; opt-in via `hlmInput`.
 * @see docs/MIGRATION_PLAN.md
 */
@Directive({
  selector: 'input[hlmInput], textarea[hlmInput]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmInputDirective {
  readonly error = input(false, { transform: booleanAttribute });

  protected readonly hostClass = computed(() => twMerge(inputVariants({ error: this.error() })));
}
