import { computed, Directive, input } from '@angular/core';
import { BrnButton } from '@spartan-ng/brain/button';
import { twMerge } from 'tailwind-merge';
import {
  buttonVariants,
  type ButtonIconPlacementCva,
  type ButtonVariants,
} from './button-variants';

type ButtonVariant = NonNullable<ButtonVariants['variant']>;
type ButtonSize = NonNullable<ButtonVariants['size']>;

/**
 * Spartan brain button + Feldpost hlm (CVA/Tailwind) styling; opt-in via `hlmBtn` (and `brnButton` for brain behavior).
 * @see docs/MIGRATION_PLAN.md
 */
@Directive({
  selector: 'button[hlmBtn],a[hlmBtn]',
  standalone: true,
  hostDirectives: [BrnButton],
  host: {
    '[class]': 'hostClass()',
  },
})
export class HlmButtonDirective {
  readonly variant = input<ButtonVariant>('default');
  readonly size = input<ButtonSize>('default');

  /**
   * When the button pairs an icon with a label, set to the icon’s box side along reading order (`start` / `end`).
   * Horizontal padding stays `ps-2`/`pe-2` for all placements; this input is for composition semantics and future styling.
   * Icon-only `size="icon"` ignores this (square hit target).
   */
  readonly iconPlacement = input<'start' | 'end' | undefined>(undefined);

  /** Merged Tailwind classes for the trigger surface */
  protected readonly hostClass = computed(() => {
    const size = this.size();
    const edge = this.iconPlacement();
    let iconPlacement: ButtonIconPlacementCva = 'balanced';
    if (size !== 'icon' && size !== 'icon-sm' && size !== 'icon-md') {
      if (edge === 'start') iconPlacement = 'iconStart';
      else if (edge === 'end') iconPlacement = 'iconEnd';
    }
    return twMerge(
      buttonVariants({
        variant: this.variant(),
        size,
        iconPlacement,
      }),
    );
  });
}
