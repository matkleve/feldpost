import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Uppercase page title for page-grid left rails.
 * @see docs/design/page-rail-grid.md
 */
@Component({
  selector: 'app-page-rail-title',
  standalone: true,
  templateUrl: './page-rail-title.component.html',
  styleUrl: './page-rail-title.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageRailTitleComponent {
  readonly title = input.required<string>();
}
