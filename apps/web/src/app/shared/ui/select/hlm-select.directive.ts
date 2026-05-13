// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-select-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { booleanAttribute, computed, Directive, input } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { selectVariants, type SelectVariants } from './select-variants';

/**
 * Native `<select>` styling; opt-in via `hlmSelect`.
 * @see docs/MIGRATION_PLAN.md
 */
@Directive({
  selector: 'select[hlmSelect]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmSelectDirective {
  readonly size = input<NonNullable<SelectVariants['size']>>('md');
  readonly error = input(false, { transform: booleanAttribute });

  protected readonly hostClass = computed(() =>
    twMerge(selectVariants({ size: this.size(), error: this.error() })),
  );
}
