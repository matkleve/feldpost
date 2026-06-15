import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Centered page rail grid: fixed 52rem center column (aligned with /media), side rails in outer gutters.
 * @see docs/design/page-rail-grid.md
 */
@Component({
  selector: 'app-page-grid',
  standalone: true,
  templateUrl: './page-grid.component.html',
  styleUrl: './page-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'page-grid-host',
  },
})
export class PageGridComponent {
  /** When true, mounts `[pageGridLeft]` in the left gutter column (end-aligned). */
  readonly leftRail = input(true);

  /** When true, mounts `[pageGridRight]` in the right gutter column (start-aligned). */
  readonly rightRailOpen = input(false);

  /** When true and the right rail is closed, center spans columns 2–3 (projects dashboard / detail without details). */
  readonly centerExpanded = input(false);
}
