// TODO(spartan-v4): Replace this local hlm implementation with the published
// @spartan-ng/ui-switch-helm package once spartan ships Tailwind v4-compatible
// helm releases. Track: https://github.com/goetzrobin/spartan/issues
// No `BrnSwitch` in the current `@spartan-ng/brain` pin — host-only CVA until brain/switch exists.

import { booleanAttribute, computed, Directive, input } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import { switchThumbVariants, switchVariants } from './switch-variants';

type SwitchState = 'checked' | 'unchecked';

/**
 * Switch track; set `checked` + optional `hlmSwitchThumb` sibling with the same `checked` value.
 * @see docs/MIGRATION_PLAN.md
 */
@Directive({
  selector: '[hlmSwitch]',
  standalone: true,
  host: {
    '[attr.data-state]': 'dataState()',
    '[class]': 'hostClass()',
  },
})
export class HlmSwitchDirective {
  readonly checked = input(false, { transform: booleanAttribute });

  protected readonly dataState = computed<SwitchState>(() =>
    this.checked() ? 'checked' : 'unchecked',
  );

  protected readonly hostClass = computed(() => twMerge(switchVariants()));
}

/**
 * Switch thumb node inside a `[hlmSwitch]` track.
 * @see docs/MIGRATION_PLAN.md
 */
@Directive({
  selector: '[hlmSwitchThumb]',
  standalone: true,
  host: {
    '[attr.data-state]': 'dataState()',
    '[class]': 'hostClass()',
  },
})
export class HlmSwitchThumbDirective {
  readonly checked = input(false, { transform: booleanAttribute });

  protected readonly dataState = computed<SwitchState>(() =>
    this.checked() ? 'checked' : 'unchecked',
  );

  protected readonly hostClass = computed(() => twMerge(switchThumbVariants()));
}
