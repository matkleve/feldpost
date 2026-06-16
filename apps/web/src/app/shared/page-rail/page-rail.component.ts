import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Composable left-rail shell for page-grid: title, nav, search, toolbar, scroll body, footer slots.
 * @see docs/specs/component/page-rail/page-rail.md
 */
@Component({
  selector: 'app-page-rail',
  standalone: true,
  templateUrl: './page-rail.component.html',
  styleUrl: './page-rail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'page-rail-host',
  },
})
export class PageRailComponent {
  /** Accessible name for the rail landmark (`nav`). */
  readonly ariaLabel = input.required<string>();
}
