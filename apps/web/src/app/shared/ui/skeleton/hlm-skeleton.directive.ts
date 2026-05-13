// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-skeleton-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// No `@spartan-ng/brain/skeleton` entry in the current `@spartan-ng/brain` pin — host-only CVA until brain/skeleton exists.

import { computed, Directive } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { skeletonVariants } from './skeleton-variants';

/**
 * Pulse skeleton styling; opt-in via `hlmSkeleton` on any element.
 * @see docs/MIGRATION_PLAN.md
 */
@Directive({
  selector: '[hlmSkeleton]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmSkeletonDirective {
  protected readonly hostClass = computed(() => twMerge(skeletonVariants()));
}
