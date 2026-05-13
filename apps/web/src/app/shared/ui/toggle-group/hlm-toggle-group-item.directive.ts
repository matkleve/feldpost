// TODO(spartan-v4): Replace with @spartan-ng/ui-toggle-group-helm when available for Tailwind v4.
// @see docs/MIGRATION_PLAN.md

import { computed, Directive, input } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { toggleGroupItemVariants, type ToggleGroupItemVariantProps } from './toggle-group-variants';

/** Helm-style classes for `BrnToggleGroupItem` host (`button[brnToggleGroupItem]`). */
@Directive({
  selector: 'button[hlmToggleGroupItem]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmToggleGroupItemDirective {
  readonly size = input<NonNullable<ToggleGroupItemVariantProps['size']>>('md');
  readonly userClass = input<string>('', { alias: 'class' });

  protected readonly hostClass = computed(() =>
    twMerge(toggleGroupItemVariants({ size: this.size() }), this.userClass()),
  );
}
