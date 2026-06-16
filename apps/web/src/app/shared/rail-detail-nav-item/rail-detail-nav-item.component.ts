import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Settings-overlay-style rail row: icon, title, subtitle, chevron.
 * @see docs/specs/component/page-rail/page-rail.md
 */
@Component({
  selector: 'app-rail-detail-nav-item',
  standalone: true,
  templateUrl: './rail-detail-nav-item.component.html',
  styleUrl: './rail-detail-nav-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RailDetailNavItemComponent {
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly active = input(false);
  readonly disabled = input(false);

  readonly clicked = output<void>();
}
