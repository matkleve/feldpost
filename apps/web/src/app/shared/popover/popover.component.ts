// Chrome-only floating surface; positioning and dismiss are parent-owned.
// @see docs/specs/component/ui-primitives/popover.md

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-popover',
  standalone: true,
  templateUrl: './popover.component.html',
  styleUrl: './popover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'resolvedHostClass()',
    '[style.min-width]': 'minWidthStyle()',
    '[style.max-width]': 'maxWidthStyle()',
  },
})
export class PopoverComponent {
  // Extra utility classes from parent (e.g. Tailwind width)
  // @see docs/specs/component/ui-primitives/popover.md §Props / Inputs
  readonly panelClass = input<string>('');

  readonly minWidth = input<number | null>(null);

  readonly maxWidth = input<number | null>(null);

  // Scrollable shell variant
  // @see docs/specs/component/ui-primitives/popover.md §Variants
  readonly scrollable = input<boolean>(false);

  protected resolvedHostClass(): string {
    const parts = ['popover'];
    if (this.scrollable()) {
      parts.push('popover--scrollable');
    }
    const extra = this.panelClass().trim();
    if (extra) {
      parts.push(extra);
    }
    return parts.join(' ');
  }

  protected minWidthStyle(): string | null {
    const v = this.minWidth();
    return v != null ? `${v}px` : null;
  }

  protected maxWidthStyle(): string | null {
    const v = this.maxWidth();
    return v != null ? `${v}px` : null;
  }
}
