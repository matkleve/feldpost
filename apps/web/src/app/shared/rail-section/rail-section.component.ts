import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * Collapsible page-rail section with icon heading and optional header actions.
 * @see docs/specs/component/page-rail/page-rail.md
 */
@Component({
  selector: 'app-rail-section',
  standalone: true,
  templateUrl: './rail-section.component.html',
  styleUrl: './rail-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'rail-section-host',
    '[class.rail-section-host--fill]': 'fillHeight()',
  },
})
export class RailSectionComponent {
  readonly label = input.required<string>();
  readonly icon = input.required<string>();
  readonly collapsible = input(true);
  readonly fillHeight = input(false);
  readonly actionsAriaLabel = input<string | null>(null);

  readonly expanded = model(true);
}
