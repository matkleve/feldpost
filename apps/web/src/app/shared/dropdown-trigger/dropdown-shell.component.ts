import { Component, ElementRef, inject, input, output } from '@angular/core';

@Component({
  selector: 'app-dropdown-shell',
  standalone: true,
  template: ` <ng-content /> `,
  host: {
    '[class]': 'hostClass()',
    '[style.position]': '"fixed"',
    '[style.top.px]': 'top()',
    '[style.left.px]': 'left()',
    '[style.min-width.px]': 'minWidth()',
    '[style.max-width.px]': 'maxWidth()',
    '[style.z-index]': '"var(--z-dropdown)"',
    '(click)': '$event.stopPropagation()',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape()',
  },
  styles: [
    ':host { display: block; overflow: auto; overscroll-behavior: contain; display: flex; flex-direction: column; background: var(--color-bg-elevated); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--elevation-dropdown); }',
  ],
})
export class DropdownShellComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly top = input.required<number>();
  readonly left = input.required<number>();
  readonly minWidth = input<number | null>(null);
  readonly maxWidth = input<number | null>(null);
  readonly panelClass = input('');
  readonly outsideCloseEnabled = input(true);

  readonly closeRequested = output<void>();

  hostClass(): string {
    return this.panelClass().trim();
  }

  requestClose(): void {
    this.closeRequested.emit();
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.outsideCloseEnabled()) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (!this.host.nativeElement.contains(target)) {
      this.requestClose();
    }
  }

  onEscape(): void {
    this.requestClose();
  }
}
