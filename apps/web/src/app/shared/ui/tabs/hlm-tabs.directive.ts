// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-tabs-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// @see docs/MIGRATION_PLAN.md

import { computed, Directive, input } from '@angular/core';
import { twMerge } from 'tailwind-merge';

/**
 * Root styling hook for `[brnTabs]`; geometry/token shell lives on list/trigger/content CVAs.
 * @see docs/MIGRATION_PLAN.md
 */
@Directive({
  selector: '[hlmTabs][brnTabs]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmTabsDirective {
  readonly userClass = input<string>('', { alias: 'class' });

  protected readonly hostClass = computed(() => twMerge(this.userClass()));
}
