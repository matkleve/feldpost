import { Component, HostListener, input, output, signal } from '@angular/core';

/**
 * Horizontal resize handle between top- and bottom-aligned panel stacks in the column.
 * @see docs/specs/ui/shell/shell-panel-resize.md § Stack divider
 */
@Component({
  selector: 'app-shell-panel-body-divider',
  standalone: true,
  templateUrl: './shell-panel-body-divider.component.html',
  styleUrl: './shell-panel-body-divider.component.scss',
  host: {
    role: 'separator',
    '[attr.aria-orientation]': '"horizontal"',
    '[attr.aria-valuenow]': 'currentExtent()',
    '[attr.aria-valuemin]': 'minExtent()',
    '[attr.aria-valuemax]': 'maxExtent()',
    '[attr.tabindex]': '"0"',
    '[class.shell-panel-body-divider--dragging]': 'dragging()',
  },
})
export class ShellPanelBodyDividerComponent {
  readonly currentExtent = input.required<number>();
  readonly minExtent = input.required<number>();
  readonly maxExtent = input.required<number>();
  readonly defaultExtent = input.required<number>();

  readonly extentChange = output<number>();

  readonly dragging = signal(false);

  private dragStartY = 0;
  private dragStartExtent = 0;

  private readonly onPointerMoveBound = this.onPointerMove.bind(this);
  private readonly onPointerUpBound = this.onPointerUp.bind(this);

  onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    this.dragging.set(true);
    this.dragStartY = event.clientY;
    this.dragStartExtent = this.currentExtent();

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';

    document.addEventListener('pointermove', this.onPointerMoveBound);
    document.addEventListener('pointerup', this.onPointerUpBound);
    document.addEventListener('pointercancel', this.onPointerUpBound);
  }

  private onPointerMove(event: PointerEvent): void {
    const delta = event.clientY - this.dragStartY;
    this.extentChange.emit(this.dragStartExtent + delta);
  }

  private onPointerUp(): void {
    this.dragging.set(false);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    document.removeEventListener('pointermove', this.onPointerMoveBound);
    document.removeEventListener('pointerup', this.onPointerUpBound);
    document.removeEventListener('pointercancel', this.onPointerUpBound);
  }

  onDoubleClick(): void {
    this.extentChange.emit(this.defaultExtent());
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const step = 8;
    let next: number | null = null;

    switch (event.key) {
      case 'ArrowDown':
        next = this.currentExtent() + step;
        break;
      case 'ArrowUp':
        next = this.currentExtent() - step;
        break;
      case 'Home':
        next = this.minExtent();
        break;
      case 'End':
        next = this.maxExtent();
        break;
      default:
        return;
    }

    event.preventDefault();
    if (next !== null) {
      this.extentChange.emit(next);
    }
  }
}
