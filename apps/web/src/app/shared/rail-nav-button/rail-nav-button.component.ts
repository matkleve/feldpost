import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { HLM_BUTTON_IMPORTS } from '../ui/button';

/**
 * Primary page-rail nav row (dashboard, invites) with quiet-row emphasis.
 * @see docs/specs/component/page-rail/page-rail.md
 */
@Component({
  selector: 'app-rail-nav-button',
  standalone: true,
  imports: [...HLM_BUTTON_IMPORTS],
  templateUrl: './rail-nav-button.component.html',
  styleUrl: './rail-nav-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RailNavButtonComponent {
  readonly label = input.required<string>();
  readonly icon = input.required<string>();
  readonly active = input(false);
  readonly pressed = input<boolean | null>(null);

  readonly clicked = output<void>();
}
