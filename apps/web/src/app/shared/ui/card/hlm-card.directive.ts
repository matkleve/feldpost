// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-card-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { computed, Directive } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { cardVariants } from './card-variants';

/**
 * Card root layout surface; opt-in via `hlmCard`.
 * @see docs/MIGRATION_PLAN.md
 */
@Directive({
  selector: '[hlmCard]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmCardDirective {
  protected readonly hostClass = computed(() => twMerge(cardVariants()));
}
