// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-form-field-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// Local CVA mirrors the spartan hlm API so the swap is a drop-in.

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { formFieldVariants } from './form-field-variants';

/**
 * Wraps label + control + optional hint/error in a consistent vertical rhythm.
 * @see docs/MIGRATION_PLAN.md
 */
@Component({
  selector: 'hlm-form-field',
  standalone: true,
  template: `<div [class]="wrapperClass()"><ng-content></ng-content></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HlmFormFieldComponent {
  readonly userClass = input<string>('', { alias: 'class' });

  protected readonly wrapperClass = computed(() => twMerge(formFieldVariants(), this.userClass()));
}
