// Figma Dev URL: https://www.figma.com/design/eCgblR1PiQnIKoFBYhCWwA/Untitled?node-id=164-2177&m=dev
// @see docs/specs/component/ui-primitives/panel-trigger.md

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

// Stable state: panelState='closed' — chevron points down, neutral-variant-95 fill at rest
// Stable state: panelState='open' — chevron rotates 180deg, neutral-variant-95 fill at rest
// @see docs/specs/component/ui-primitives/panel-trigger.md §State
export type PanelState = 'closed' | 'open';

export type PanelTriggerLayout = 'icon-text-action' | 'text-action';

@Component({
  selector: 'app-panel-trigger',
  standalone: true,
  templateUrl: './panel-trigger.component.html',
  styleUrl: './panel-trigger.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-state]': 'panelState()',
    '[attr.data-layout]': 'layout()',
  },
})
export class PanelTriggerComponent {
  // Single visual API: drives chevron rotation and [attr.data-state] on host
  // @see docs/specs/component/ui-primitives/panel-trigger.md §State
  readonly panelState = input<PanelState>('closed');

  // Layout axis: determines horizontal padding per Figma variant
  // @see docs/specs/component/ui-primitives/panel-trigger.md §Variants
  readonly layout = input<PanelTriggerLayout>('icon-text-action');

  // Native disabled gate; parent must keep panelState consistent when disabling
  // @see docs/design/state-visuals.md §Compact toolbar triggers
  readonly disabled = input<boolean>(false);

  // Parent is responsible for toggling panelState; trigger only signals intent
  // @see docs/specs/component/ui-primitives/panel-trigger.md §Actions #1
  readonly toggleRequested = output<void>();

  protected onButtonClick(): void {
    this.toggleRequested.emit();
  }
}
