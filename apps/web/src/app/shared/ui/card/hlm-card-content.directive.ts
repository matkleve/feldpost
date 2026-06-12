// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-card-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { computed, Directive } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { cardContentVariants } from './card-variants';

/**
 * Card primary content region; opt-in via `hlmCardContent`.
 * @see docs/MIGRATION_PLAN.md
 */
@Directive({
  selector: '[hlmCardContent]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmCardContentDirective {
  protected readonly hostClass = computed(() => twMerge(cardContentVariants()));
}
