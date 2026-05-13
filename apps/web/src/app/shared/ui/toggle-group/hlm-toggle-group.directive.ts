// TODO(spartan-v4): Replace with @spartan-ng/ui-toggle-group-helm when available for Tailwind v4.
// @see docs/MIGRATION_PLAN.md

import { computed, Directive, input } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { toggleGroupVariants } from './toggle-group-variants';

/** Helm-style classes for `BrnToggleGroup` host (`[brnToggleGroup]`). */
@Directive({
  selector: '[hlmToggleGroup]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmToggleGroupDirective {
  readonly userClass = input<string>('', { alias: 'class' });

  protected readonly hostClass = computed(() =>
    twMerge(toggleGroupVariants(), this.userClass()),
  );
}
