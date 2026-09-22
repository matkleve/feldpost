import { afterNextRender, Component, DestroyRef, ElementRef, inject } from '@angular/core';
import { WorkspacePaneLayoutMapEffectsService } from '../../core/workspace-pane/workspace-pane-layout-map-effects.service';
import { scheduleMapInvalidation } from './schedule-map-invalidation';

/**
 * Owns the four authenticated tracks and the rail-width custom property.
 * @see docs/specs/ui/shell/grid-shell.md
 */
@Component({
  selector: 'app-grid-shell',
  standalone: true,
  templateUrl: './grid-shell.component.html',
  styleUrl: './grid-shell.component.scss',
})
export class GridShellComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly mapLayoutEffects = inject(WorkspacePaneLayoutMapEffectsService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const root = this.host.nativeElement;
      const left = root.querySelector('[data-shell-track="left"]');
      const panels = root.querySelector('[data-shell-track="panels"]');
      if (!(left instanceof HTMLElement)) return;

      const publish = (): void => {
        document.documentElement.style.setProperty(
          '--feldpost-sidebar-width',
          `${left.getBoundingClientRect().width}px`,
        );
        scheduleMapInvalidation(() => {
          this.mapLayoutEffects.getMapEffects()?.invalidateMapSize();
        });
      };

      publish();
      const observer = new ResizeObserver(() => publish());
      observer.observe(left);
      if (panels instanceof HTMLElement) observer.observe(panels);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
