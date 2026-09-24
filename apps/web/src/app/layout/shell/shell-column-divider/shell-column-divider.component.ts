import { Component, HostListener, input, output, signal } from '@angular/core';

/**
 * Vertical resize handle between main canvas and panel column (grid shell).
 * @see docs/specs/ui/shell/shell-panel-resize.md
 */
@Component({
  selector: 'app-shell-column-divider',
  standalone: true,
  templateUrl: './shell-column-divider.component.html',
  styleUrl: './shell-column-divider.component.scss',
  host: {
    role: 'separator',
    '[attr.aria-orientation]': '"vertical"',
    '[attr.aria-valuenow]': 'currentWidth()',
    '[attr.aria-valuemin]': 'minWidth()',
    '[attr.aria-valuemax]': 'maxWidth()',
    '[attr.tabindex]': '"0"',
    '[class.shell-column-divider--dragging]': 'dragging()',
  },
})
export class ShellColumnDividerComponent {
  readonly currentWidth = input.required<number>();
  readonly minWidth = input.required<number>();
  readonly maxWidth = input.required<number>();
  readonly defaultWidth = input.required<number>();

  readonly widthChange = output<number>();

  readonly dragging = signal(false);

  private dragStartX = 0;
  private dragStartWidth = 0;

  private readonly onPointerMoveBound = this.onPointerMove.bind(this);
  private readonly onPointerUpBound = this.onPointerUp.bind(this);

  onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    this.dragging.set(true);
    this.dragStartX = event.clientX;
    this.dragStartWidth = this.currentWidth();

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    document.addEventListener('pointermove', this.onPointerMoveBound);
    document.addEventListener('pointerup', this.onPointerUpBound);
    document.addEventListener('pointercancel', this.onPointerUpBound);
  }

  private onPointerMove(event: PointerEvent): void {
    const delta = this.dragStartX - event.clientX;
    const newWidth = this.dragStartWidth + delta;
    this.widthChange.emit(newWidth);
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
    this.widthChange.emit(this.defaultWidth());
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const step = 8;
    let newWidth: number | null = null;

    switch (event.key) {
      case 'ArrowLeft':
        newWidth = this.currentWidth() + step;
        break;
      case 'ArrowRight':
        newWidth = this.currentWidth() - step;
        break;
      case 'Home':
        newWidth = this.minWidth();
        break;
      case 'End':
        newWidth = this.maxWidth();
        break;
      default:
        return;
    }

    event.preventDefault();
    if (newWidth !== null) {
      this.widthChange.emit(newWidth);
    }
  }
}
