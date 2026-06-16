import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Uppercase recency bucket label above compact rail lists.
 * @see docs/specs/component/page-rail/page-rail.md
 */
@Component({
  selector: 'app-rail-group-heading',
  standalone: true,
  template: `<p class="rail-group-heading">{{ label() }}</p>`,
  styleUrl: './rail-group-heading.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RailGroupHeadingComponent {
  readonly label = input.required<string>();
}
