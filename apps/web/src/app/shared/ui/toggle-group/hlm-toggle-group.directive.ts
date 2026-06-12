// TODO(spartan-v4): Replace with @spartan-ng/ui-toggle-group-helm when available for Tailwind v4.
// @see docs/MIGRATION_PLAN.md

import { computed, Directive, input } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { toggleGroupVariants, type PillToggleSize } from './toggle-group-variants';

/** Helm-style classes for `BrnToggleGroup` host (`[brnToggleGroup]`). */
@Directive({
  selector: '[hlmToggleGroup]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmToggleGroupDirective {
  /** Track height matches `hlmBtn` sm/md/lg row heights (default md = h-9). */
  readonly size = input<PillToggleSize>('md');
  readonly userClass = input<string>('', { alias: 'class' });

  protected readonly hostClass = computed(() =>
    twMerge(toggleGroupVariants({ size: this.size() }), this.userClass()),
  );
}
