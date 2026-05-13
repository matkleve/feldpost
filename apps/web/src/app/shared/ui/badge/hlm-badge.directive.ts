// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-badge-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { computed, Directive, input } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { badgeVariants, type BadgeVariants } from './badge-variants';

type BadgeVariant = NonNullable<BadgeVariants['variant']>;

/**
 * Non-interactive badge styling; opt-in via `hlmBadge`.
 * @see docs/MIGRATION_PLAN.md
 */
@Directive({
  selector: '[hlmBadge]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmBadgeDirective {
  readonly variant = input<BadgeVariant>('default');

  protected readonly hostClass = computed(() => twMerge(badgeVariants({ variant: this.variant() })));
}
