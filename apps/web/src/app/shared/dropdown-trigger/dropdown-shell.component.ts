/**
 * Open-time stacking: shell host only — inline `z-index: 300` (dropdown plane); no subtree co-owner; `hlmMenu` CVA `z-50` is subordinate (cascade).
 * @see docs/specs/component/filters/dropdown-system.md#open-time-stacking-owner-normative
 *
 * DropdownShell — generic floating container. Supports two position modes:
 * - `fixed` (default): viewport-anchored. When `[anchor]` is provided the shell measures the
 *   anchor element and positions itself with smart below/above and start/end flip logic, updating
 *   on scroll and resize. When `[anchor]` is null the caller supplies raw `[top]`/`[left]` px
 *   coordinates (used for map context menus that originate from Leaflet lat/lng, not DOM elements).
 * - `absolute`: in-flow anchor; caller CSS (not top/left inputs) controls positioning. Used for
 *   detail-row inline panels (e.g. projects picker) that must scroll with their parent container.
 *
 * NAMING NOTE: This component is semantically a *popover shell*, not a dropdown.
 * A dropdown implies a list of options; this shell hosts arbitrary content anchored
 * at caller-supplied coordinates or an anchor element.
 *
 * TODO(rename): Rename to `PopoverShellComponent` / `app-popover-shell` when the
 * full CDK Overlay migration is done. That migration will replace the manual
 * anchor/top/left inputs with `@angular/cdk/overlay` FlexibleConnectedPositionStrategy,
 * enabling proper collision detection, scroll strategies, and flip behavior.
 * @see apps/web/src/app/shared/ui/popover/ for the hlm visual layer.
 * @see https://github.com/goetzrobin/spartan — BrnPopover for the future brn layer.
 *
 * TODO(brn-menu): `@spartan-ng/brain` has no `BrnMenu` / `./menu` export (alpha.691). Panel chrome uses
 * local `hlmMenuContent`; positioning stays manual until brain ships a menu/popover trigger pair.
 *
 * OWNERSHIP (anchored shell — normative detail in spec):
 * - **Toolbar panel width floor:** `dropdown-shell.component.scss` only (`:host.toolbar-dropdown`, `.toolbar-dropdown--filter`).
 * - **Anchor-based placement:** this component only (`positionFromAnchor`); callers must not reimplement flip logic.
 * - **Map / context menus (no anchor element):** `[top]` / `[left]` per callsite — not the toolbar floors.
 * - **Stacking:** host `z-index: 300` is authoritative; `HlmMenuContentDirective` CVA also applies `z-50` on the same host — inline wins.
 * - **Escape + outside-close** for the mounted shell: this component only; parents must not duplicate `document:keydown.escape`.
 * @see docs/specs/component/filters/dropdown-system.md — Ownership matrix, Escape, Stacking, document:click
 */
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
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

const PLACEMENT_GAP_PX = 4;
const PLACEMENT_MARGIN_PX = 8;

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
    '[style.position]': 'positionMode()',
    '[style.top.px]': 'inlineTop()',
    '[style.left.px]': 'inlineLeft()',
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
  private readonly destroyRef = inject(DestroyRef);

  /**
   * `fixed` (default): viewport-anchored via anchor element or raw `[top]`/`[left]` px.
   * `absolute`: caller CSS owns positioning; `top`/`left`/`anchor` inputs are ignored.
   */
  readonly positionMode = input<'fixed' | 'absolute'>('fixed');

  /**
   * Anchor element. When provided, the shell positions itself relative to this element,
   * flipping above/below and start/end as needed to stay within the viewport.
   * Mutually exclusive with raw `[top]`/`[left]` — if `anchor` is set, top/left are ignored.
   */
  readonly anchor = input<HTMLElement | null>(null);

  /**
   * Preferred horizontal alignment relative to anchor.
   * `start` (default): left-aligned to anchor.left, flips to end if off-screen.
   * `end`: right-aligned to anchor.right, flips to start if off-screen.
   */
  readonly placement = input<'start' | 'end'>('start');

  /** Raw px coordinates — only used when `anchor` is null and `positionMode` is `fixed`. */
  readonly top = input<number>(0);
  readonly left = input<number>(0);

  readonly minWidth = input<number | null>(null);
  readonly maxWidth = input<number | null>(null);
  readonly panelClass = input('');
  readonly outsideCloseEnabled = input(true);

  protected readonly clampedTop = signal(0);
  protected readonly clampedLeft = signal(0);

  /** Null in absolute mode or when anchor-based positioning is active — removes the inline style so CSS takes over. */
  protected readonly inlineTop = computed(() =>
    this.positionMode() === 'fixed' ? this.clampedTop() : null,
  );
  protected readonly inlineLeft = computed(() =>
    this.positionMode() === 'fixed' ? this.clampedLeft() : null,
  );

  readonly closeRequested = output<void>();

  constructor() {
    // Positioning effect: anchor-based or legacy raw coords.
    effect(() => {
      const anchor = this.anchor();
      if (anchor) {
        // Seed an approximate position immediately (before panel size is known).
        const anchorRect = anchor.getBoundingClientRect();
        this.clampedTop.set(anchorRect.bottom + PLACEMENT_GAP_PX);
        this.clampedLeft.set(anchorRect.left);
        untracked(() => {
          if (typeof window !== 'undefined') {
            requestAnimationFrame(() => this.positionFromAnchor());
          }
        });
        return;
      }

      if (this.positionMode() !== 'fixed') {
        return;
      }

      // Legacy raw coordinates path.
      const desiredTop = this.top();
      const desiredLeft = this.left();
      this.clampedTop.set(desiredTop);
      this.clampedLeft.set(desiredLeft);
      untracked(() => this.scheduleViewportClamp(desiredLeft, desiredTop));
    });

    afterNextRender(() => {
      if (this.anchor()) {
        requestAnimationFrame(() => this.positionFromAnchor());
      } else if (this.positionMode() === 'fixed') {
        this.scheduleViewportClamp(this.left(), this.top());
      }
    });

    // Re-position on scroll (any ancestor) and viewport resize.
    if (typeof window !== 'undefined') {
      const reposition = () => {
        if (this.anchor() && this.positionMode() === 'fixed') {
          requestAnimationFrame(() => this.positionFromAnchor());
        }
      };
      document.addEventListener('scroll', reposition, { capture: true, passive: true });
      window.addEventListener('resize', reposition, { passive: true });
      this.destroyRef.onDestroy(() => {
        document.removeEventListener('scroll', reposition, true);
        window.removeEventListener('resize', reposition);
      });
    }
  }

  /**
   * Position the shell relative to `anchor()` with below/above and start/end flip logic.
   * Called after render so the panel's actual size is available.
   */
  private positionFromAnchor(): void {
    const anchor = this.anchor();
    if (!anchor || this.positionMode() !== 'fixed') {
      return;
    }

    const anchorRect = anchor.getBoundingClientRect();
    const panel = this.host.nativeElement;
    const panelW = panel.offsetWidth || 0;
    const panelH = panel.offsetHeight || 0;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = PLACEMENT_MARGIN_PX;
    const gap = PLACEMENT_GAP_PX;

    // Vertical: prefer below anchor; flip above when not enough space.
    const belowTop = anchorRect.bottom + gap;
    const aboveTop = anchorRect.top - gap - panelH;
    const fitsBelow = panelH === 0 || belowTop + panelH <= vh - margin;
    const rawTop = fitsBelow ? belowTop : Math.max(margin, aboveTop);
    const top = Math.min(rawTop, vh - panelH - margin);

    // Horizontal: start = left-align to anchor.left, end = right-align to anchor.right.
    let left: number;
    if (this.placement() === 'end') {
      left = anchorRect.right - panelW;
      if (left < margin) {
        left = anchorRect.left; // flip to start
      }
    } else {
      left = anchorRect.left;
      if (panelW > 0 && left + panelW > vw - margin) {
        left = anchorRect.right - panelW; // flip to end
      }
    }
    left = Math.max(margin, Math.min(left, vw - panelW - margin));

    this.clampedTop.set(Math.round(Math.max(margin, top)));
    this.clampedLeft.set(Math.round(left));
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
