// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-tabs-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// @see docs/MIGRATION_PLAN.md

import { computed, Directive, input } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { tabsListVariants, type TabsListVariantProps } from './tabs-variants';

@Directive({
  selector: '[hlmTabsList][brnTabsList]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
    '[attr.data-variant]': 'variant()',
  },
})
export class HlmTabsListDirective {
  readonly variant = input<NonNullable<TabsListVariantProps['variant']>>('default');
  readonly userClass = input<string>('', { alias: 'class' });

  protected readonly hostClass = computed(() =>
    twMerge(tabsListVariants({ variant: this.variant() }), this.userClass()),
  );
}
