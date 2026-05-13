/**
 * DropdownShell — generic fixed-position floating container.
 *
 * NAMING NOTE: This component is semantically a *popover shell*, not a dropdown.
 * A dropdown implies a list of options; this shell hosts arbitrary content anchored
 * at caller-supplied pixel coordinates (toolbar menus, map context menus, etc.).
 *
 * TODO(rename): Rename to `PopoverShellComponent` / `app-popover-shell` when the
 * full CDK Overlay migration is done. That migration will replace the manual
 * top/left inputs with `@angular/cdk/overlay` FlexibleConnectedPositionStrategy,
 * enabling proper collision detection, scroll strategies, and flip behavior.
 * @see apps/web/src/app/shared/ui/popover/ for the hlm visual layer.
 * @see https://github.com/goetzrobin/spartan — BrnPopover for the future brn layer.
 *
 * TODO(brn-menu): `@spartan-ng/brain` has no `BrnMenu` / `./menu` export (alpha.691). Panel chrome uses
 * local `hlmMenuContent`; positioning stays manual until brain ships a menu/popover trigger pair.
 *
 * Callsite count: 9 instances in 7 templates (18 HTML tag matches; 19 total rg matches including this file's selector).
 */
import { Component, ElementRef, inject, input, output } from '@angular/core';
import { HlmMenuContentDirective } from '../ui/menu';

@Component({
  selector: 'app-dropdown-shell',
  standalone: true,
  imports: [HlmMenuContentDirective],
  hostDirectives: [
    {
      directive: HlmMenuContentDirective,
      inputs: ['class: panelClass'],
    },
  ],
  template: ` <ng-content /> `,
  styleUrl: './dropdown-shell.component.scss',
  host: {
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
