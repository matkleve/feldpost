// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-spinner-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// No `@spartan-ng/brain/spinner` entry in the current `@spartan-ng/brain` pin — local CVA until brain/spinner exists.

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { spinnerVariants, type SpinnerVariants } from './spinner-variants';

type SpinnerSize = NonNullable<SpinnerVariants['size']>;

/**
 * Decorative loading ring; `aria-hidden` — parent must supply live status when needed.
 * @see docs/MIGRATION_PLAN.md
 */
@Component({
  selector: 'hlm-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="spanClass()" aria-hidden="true"></span>`,
})
export class HlmSpinnerComponent {
  readonly size = input<SpinnerSize>('md');

  protected readonly spanClass = computed(() => twMerge(spinnerVariants({ size: this.size() })));
}
