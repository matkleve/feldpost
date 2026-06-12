// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-card-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { computed, Directive } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { cardHeaderVariants } from './card-variants';

/**
 * Card header region; opt-in via `hlmCardHeader`.
 * @see docs/MIGRATION_PLAN.md
 */
@Directive({
  selector: '[hlmCardHeader]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmCardHeaderDirective {
  protected readonly hostClass = computed(() => twMerge(cardHeaderVariants()));
}
