// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-tabs-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// @see docs/MIGRATION_PLAN.md

import { computed, Directive, inject, input } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { HlmTabsListDirective } from './hlm-tabs-list.directive';
import { tabsTriggerVariants } from './tabs-variants';

@Directive({
  selector: 'button[hlmTabsTrigger][brnTabsTrigger]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmTabsTriggerDirective {
  private readonly tabsList = inject(HlmTabsListDirective, { optional: true, skipSelf: true });

  readonly userClass = input<string>('', { alias: 'class' });

  protected readonly hostClass = computed(() =>
    twMerge(
      tabsTriggerVariants({ variant: this.tabsList?.variant() ?? 'default' }),
      this.userClass(),
    ),
  );
}
