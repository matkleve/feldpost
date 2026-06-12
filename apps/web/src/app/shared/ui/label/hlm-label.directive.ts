// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-label-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { computed, Directive } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { labelVariants } from './label-variants';

/**
 * Form label styling; opt-in via `hlmLabel`. No `BrnLabel` in `@spartan-ng/brain` for this pin — CVA only.
 * @see docs/MIGRATION_PLAN.md
 */
@Directive({
  selector: '[hlmLabel]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmLabelDirective {
  protected readonly hostClass = computed(() => twMerge(labelVariants()));
}
