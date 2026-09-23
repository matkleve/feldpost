import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ShellLayoutService } from '../../core/shell-layout/shell-layout.service';
import {
  SHELL_PANEL_BOTTOM_STACK_IDS,
  SHELL_PANEL_TOP_STACK_IDS,
  type ShellPanelId,
} from '../../core/shell-layout/shell-layout.types';
import { ShellPanelStackResizeService } from '../../core/shell-layout/shell-panel-stack-resize.service';
import {
  SHELL_PANEL_COLUMN_STACK_GAP_PX,
  SHELL_PANEL_STACK_DIVIDER_PX,
} from '../../core/shell-layout/shell-panel-stack-resize.constants';
import { ShellPanelBodyDividerComponent } from './shell-panel-body-divider/shell-panel-body-divider.component';

/** Third track — top/bottom-aligned stacks; divider only when both overflow the column. */
@Component({
  selector: 'app-shell-panel-column',
  standalone: true,
  imports: [ShellPanelBodyDividerComponent],
  templateUrl: './shell-panel-column.component.html',
  styleUrl: './shell-panel-column.component.scss',
  host: {
    '[attr.data-empty]': 'openPanels().length === 0 ? "" : null',
    '[attr.data-stack-split]': 'needsStackSplit() ? "" : null',
  },
})
export class ShellPanelColumnComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly shellLayout = inject(ShellLayoutService);
  protected readonly stackResize = inject(ShellPanelStackResizeService);

  private readonly topStackRef = viewChild<ElementRef<HTMLElement>>('topStack');
  private readonly bottomStackRef = viewChild<ElementRef<HTMLElement>>('bottomStack');

  readonly columnHeightPx = signal(0);
  readonly topStackNaturalHeightPx = signal(0);
  readonly bottomStackNaturalHeightPx = signal(0);

  readonly openPanels = this.shellLayout.openPanels;

  readonly hasTopStack = computed(() =>
    SHELL_PANEL_TOP_STACK_IDS.some((id) => this.shellLayout.isOpen(id)),
  );

  readonly hasBottomStack = computed(() =>
    SHELL_PANEL_BOTTOM_STACK_IDS.some((id) => this.shellLayout.isOpen(id)),
  );

  readonly topStackMulti = computed(
    () => SHELL_PANEL_TOP_STACK_IDS.filter((id) => this.shellLayout.isOpen(id)).length > 1,
  );

  readonly bottomStackMulti = computed(
    () => SHELL_PANEL_BOTTOM_STACK_IDS.filter((id) => this.shellLayout.isOpen(id)).length > 1,
  );

  readonly hasBothStacks = computed(
    () => this.hasTopStack() && this.hasBottomStack(),
  );

  readonly needsStackSplit = computed(() => {
    if (!this.hasBothStacks()) {
      return false;
    }
    const column = this.columnHeightPx();
    const top = this.topStackNaturalHeightPx();
    const bottom = this.bottomStackNaturalHeightPx();
    if (column <= 0 || top <= 0 || bottom <= 0) {
      return false;
    }
    const gaps = 2 * SHELL_PANEL_COLUMN_STACK_GAP_PX;
    return top + bottom + gaps > column;
  });

  readonly showSpacer = computed(
    () => this.hasBottomStack() && !this.needsStackSplit(),
  );

  readonly stackDividerMaxExtent = computed(() => {
    const height = this.columnHeightPx();
    return height > 0
      ? this.stackResize.maxTopExtentPx(height)
      : this.stackResize.minStackPx();
  });

  readonly stackDividerDefaultExtent = computed(() => {
    const height = this.columnHeightPx();
    return height > 0
      ? this.stackResize.defaultTopExtentPx(height)
      : this.stackResize.minStackPx();
  });

  readonly topStackExtentPx = computed(() => {
    const height = this.columnHeightPx();
    if (height <= 0 || !this.needsStackSplit()) {
      return 0;
    }
    return this.stackResize.topStackExtentPx(height);
  });

  readonly bottomStackMaxPx = computed(() => {
    const height = this.columnHeightPx();
    if (height <= 0 || !this.needsStackSplit()) {
      return 0;
    }
    return Math.max(
      this.stackResize.minStackPx(),
      height - this.topStackExtentPx() - SHELL_PANEL_STACK_DIVIDER_PX,
    );
  });

  constructor() {
    afterNextRender(() => {
      const columnObserver = new ResizeObserver((entries) => {
        const height = entries[0]?.contentRect.height ?? 0;
        this.columnHeightPx.set(Math.round(height));
      });
      columnObserver.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => columnObserver.disconnect());
    });

    effect(() => {
      this.openPanels();
      const topEl = this.topStackRef()?.nativeElement;
      const bottomEl = this.bottomStackRef()?.nativeElement;

      if (!topEl && !bottomEl) {
        this.topStackNaturalHeightPx.set(0);
        this.bottomStackNaturalHeightPx.set(0);
        return;
      }

      const stackObserver = new ResizeObserver(() => {
        this.syncStackNaturalHeights();
      });

      for (const el of [topEl, bottomEl]) {
        if (!el) {
          continue;
        }
        stackObserver.observe(el);
        el.querySelectorAll(':scope > app-shell-panel-surface').forEach((node) => {
          stackObserver.observe(node);
        });
      }
      this.syncStackNaturalHeights();

      return () => stackObserver.disconnect();
    });

    effect(() => {
      const height = this.columnHeightPx();
      if (height <= 0 || !this.needsStackSplit()) {
        return;
      }
      const extent = this.stackResize.topStackExtentPx(height);
      const max = this.stackResize.maxTopExtentPx(height);
      if (extent > max) {
        this.stackResize.setTopStackExtent(extent, height);
      }
    });
  }

  isOpen(id: ShellPanelId): boolean {
    return this.shellLayout.isOpen(id);
  }

  onTopStackExtentChange(nextExtent: number): void {
    const height = this.columnHeightPx();
    if (height <= 0) {
      return;
    }
    this.stackResize.setTopStackExtent(nextExtent, height);
  }

  private syncStackNaturalHeights(): void {
    if (this.needsStackSplit()) {
      return;
    }
    const topEl = this.topStackRef()?.nativeElement;
    const bottomEl = this.bottomStackRef()?.nativeElement;
    this.topStackNaturalHeightPx.set(this.stackContentHeight(topEl));
    this.bottomStackNaturalHeightPx.set(this.stackContentHeight(bottomEl));
  }

  private stackContentHeight(el: HTMLElement | undefined): number {
    if (!el) {
      return 0;
    }
    const surfaces = Array.from(
      el.querySelectorAll(':scope > app-shell-panel-surface'),
    );
    if (surfaces.length === 0) {
      return Math.round(el.scrollHeight);
    }
    const gaps = (surfaces.length - 1) * SHELL_PANEL_COLUMN_STACK_GAP_PX;
    const inner = surfaces.reduce(
      (sum, node) => sum + (node as HTMLElement).scrollHeight,
      0,
    );
    return Math.round(Math.max(el.scrollHeight, inner + gaps));
  }
}
