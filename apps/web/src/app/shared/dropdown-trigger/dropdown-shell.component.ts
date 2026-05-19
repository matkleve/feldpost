/**
 * Open-time stacking: shell host only — inline `z-index: 300` (dropdown plane); no subtree co-owner; `hlmMenu` CVA `z-50` is subordinate (cascade).
 * @see docs/specs/component/filters/dropdown-system.md#open-time-stacking-owner-normative
 *
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
 * - **Toolbar width / height floors:** `dropdown-shell.component.scss` only (`:host.toolbar-dropdown`, `.toolbar-dropdown--filter`).
 *   TEST (non-filter, revert before ship): **18rem** width, **max-height calc(18rem * 1.6)** — **`toolbarDropdownPositionWidthPx`** uses **288**. **Filter** keeps **32rem** width floor (**512** px clamp) — rule rows need the wider shell.
 *   Do not re-declare panel width in feature SCSS. Viewport `left` / `top` clamp: shell measures panel + `clampDropdownPanelToViewport`.
 * - **Map / context menus:** `[minWidth]` / `[maxWidth]` / `panelClass` per callsite — not the toolbar `rem` floors.
 * - **Stacking:** host `z-index: 300` is authoritative; `HlmMenuContentDirective` CVA also applies `z-50` on the same host — inline wins; do not remove the inline binding thinking CVA is sufficient.
 * - **Escape + outside-close** for the mounted shell: this component only; parents that wrap `app-dropdown-shell` must not duplicate `document:keydown.escape`.
 * @see docs/specs/component/filters/dropdown-system.md — Ownership matrix, Escape, Stacking, document:click
 *
 * Callsite count: multiple templates (map, toolbar, media, upload, …); do not rely on a stale numeric count here.
 */
import {
  afterNextRender,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { clampDropdownPanelToViewport } from './dropdown-viewport-clamp';
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
    '[style.top.px]': 'clampedTop()',
    '[style.left.px]': 'clampedLeft()',
    '[style.min-width.px]': 'minWidth()',
    '[style.max-width.px]': 'maxWidth()',
    '[style.z-index]': '"300"',
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

  /** Viewport-clamped coordinates applied to the fixed host (see `clampDropdownPanelToViewport`). */
  protected readonly clampedTop = signal(0);
  protected readonly clampedLeft = signal(0);

  readonly closeRequested = output<void>();

  constructor() {
    effect(() => {
      const desiredTop = this.top();
      const desiredLeft = this.left();
      this.clampedTop.set(desiredTop);
      this.clampedLeft.set(desiredLeft);
      untracked(() => this.scheduleViewportClamp(desiredLeft, desiredTop));
    });

    afterNextRender(() => {
      this.scheduleViewportClamp(this.left(), this.top());
    });
  }

  private scheduleViewportClamp(desiredLeft: number, desiredTop: number): void {
    if (typeof window === 'undefined') {
      return;
    }
    requestAnimationFrame(() => this.applyViewportClamp(desiredLeft, desiredTop));
  }

  private applyViewportClamp(desiredLeft: number, desiredTop: number): void {
    if (this.top() !== desiredTop || this.left() !== desiredLeft) {
      return;
    }

    const el = this.host.nativeElement;
    const { width: panelW, height: panelH } = el.getBoundingClientRect();
    if (panelW <= 0 || panelH <= 0) {
      requestAnimationFrame(() => this.applyViewportClamp(desiredLeft, desiredTop));
      return;
    }

    const { left, top } = clampDropdownPanelToViewport({
      desiredLeft,
      desiredTop,
      panelWidth: panelW,
      panelHeight: panelH,
    });
    this.clampedLeft.set(left);
    this.clampedTop.set(top);
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
