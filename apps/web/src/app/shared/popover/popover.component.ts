/**
 * Popover shell for anchored floating content.
 *
 * Caller pattern:
 * 1. Wrap trigger + popover in a `position: relative` container (or attach per `BrnPopover` / CDK dialog expectations).
 * 2. Use `brn-popover` (or `[brnPopover]`) with `button[brnPopoverTriggerFor]` pointing at the popover ref; wire `state` / `open()` as needed.
 * 3. `app-popover` registers `brnPopoverContent` and `hlmPopover` on the panel surface; overlay positioning is owned by `BrnPopover` once the trigger tree is wired.
 *
 * TODO(spartan-v4): Caller integration (`brn-popover` + `BrnPopoverTrigger` at feature callsites) stays manual until those shells migrate off legacy patterns.
 *
 * TODO(brn-popover): `@spartan-ng/brain/popover` is available in this pin (`BrnPopover`, `BrnPopoverTrigger`, `BrnPopoverContent`); replace ad-hoc toggles with the trigger + content tree when each callsite is ready.
 *
 * @see apps/web/src/app/shared/ui/popover/
 * @see docs/specs/component/ui-primitives/popover.md
 */

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BrnPopoverContent } from '@spartan-ng/brain/popover';
import { HlmPopoverDirective } from '../ui/popover';

@Component({
  selector: 'app-popover',
  standalone: true,
  imports: [BrnPopoverContent, HlmPopoverDirective],
  templateUrl: './popover.component.html',
  styleUrl: './popover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
