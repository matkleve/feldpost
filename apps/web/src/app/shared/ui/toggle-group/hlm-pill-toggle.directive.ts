// TODO(spartan-v4): Replace with @spartan-ng/ui-toggle-group-helm when Tailwind v4 peers allow.
// @see docs/migration/phase-8-global-scss-elimination.md (Phase 8 §6 — pill shell)

import { booleanAttribute, computed, Directive, input } from '@angular/core';
import { twMerge } from 'tailwind-merge';
import {
  pillToggleSizeStyle,
  pillToggleVariants,
  type PillToggleSize,
} from './toggle-group-variants';

/** Layout shell + density CSS vars for segmented `hlmToggleGroup` rows (replaces `.hlm-pill-toggle*` globals). */
@Directive({
  selector: '[hlmPillToggle]',
  standalone: true,
  host: {
    '[class]': 'hostClass()',
    '[style]': 'pillDensityStyle()',
  },
})
export class HlmPillToggleDirective {
  readonly size = input<PillToggleSize>('md');
  readonly fill = input(false, { transform: booleanAttribute });
  readonly hasInactive = input(false, { transform: booleanAttribute });
  readonly vertical = input(false, { transform: booleanAttribute });
  readonly userClass = input<string>('', { alias: 'class' });

  protected readonly hostClass = computed(() =>
    twMerge(
      pillToggleVariants({
        size: this.size(),
        fill: this.fill(),
        hasInactive: this.hasInactive(),
        vertical: this.vertical(),
      }),
      this.userClass(),
    ),
  );

  protected readonly pillDensityStyle = computed(() => pillToggleSizeStyle[this.size()]);
}
