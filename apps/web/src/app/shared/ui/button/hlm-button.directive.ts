import { computed, Directive, input } from '@angular/core';
import { BrnButton } from '@spartan-ng/brain/button';
import { twMerge } from 'tailwind-merge';
import { buttonVariants, type ButtonVariants } from './button-variants';

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

  /** Merged Tailwind classes for the trigger surface */
  protected readonly hostClass = computed(() =>
    twMerge(buttonVariants({ variant: this.variant(), size: this.size() })),
  );
}
