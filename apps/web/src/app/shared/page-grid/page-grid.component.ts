import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Centered page rail grid: flexible gutters, optional left/right rails, growing center.
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
  /** When true, reserves the left rail column for projected `[pageGridLeft]` content. */
  readonly leftRail = input(true);

  /** When true, reserves the right rail column for projected `[pageGridRight]` content. */
  readonly rightRailOpen = input(false);

  readonly gridTemplateColumns = computed(() => {
    const left = this.leftRail();
    const right = this.rightRailOpen();

    if (left && right) {
      return '1fr var(--page-grid-left-width) minmax(0, 1fr) var(--page-grid-right-width) 1fr';
    }
    if (left) {
      return '1fr var(--page-grid-left-width) minmax(0, 1fr) 1fr';
    }
    return '1fr minmax(0, min(var(--page-grid-center-max), 100%)) 1fr';
  });
}
