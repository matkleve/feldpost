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
 * OWNERSHIP (anchored shell — normative detail in spec):
 * - **Toolbar width floors:** `dropdown-shell.component.scss` only (`:host.toolbar-dropdown`, `.toolbar-dropdown--filter`).
 *   Do not re-declare panel width in feature SCSS. Horizontal `left` clamp: caller TS + `toolbarDropdownPositionWidthPx`.
 * - **Map / context menus:** `[minWidth]` / `[maxWidth]` / `panelClass` per callsite — not the toolbar `rem` floors.
 * - **Stacking:** host `z-index: var(--z-dropdown)` is authoritative; `HlmMenuContentDirective` CVA also applies `z-50` on the same host — inline wins; do not remove the inline binding thinking CVA is sufficient.
 * - **Escape + outside-close** for the mounted shell: this component only; parents that wrap `app-dropdown-shell` must not duplicate `document:keydown.escape`.
 * @see docs/specs/component/filters/dropdown-system.md — Ownership matrix, Escape, Stacking, document:click
 *
 * Callsite count: multiple templates (map, toolbar, media, upload, …); do not rely on a stale numeric count here.
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
