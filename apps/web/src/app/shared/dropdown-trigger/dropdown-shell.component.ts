/**
 * Open-time stacking: shell host only — inline `z-index: 300` (dropdown plane); no subtree co-owner; `hlmMenu` CVA `z-50` is subordinate (cascade).
 * @see docs/specs/component/filters/dropdown-system.md#open-time-stacking-owner-normative
 *
 * DropdownShell — floating menu/popover container (`position: fixed`).
 * Anchor path: `computeAnchorPlacementForElement` (scroll-parent bounds, below/above flip) — host stays in
 * the template DOM (no CDK DomPortal) so toolbar/grid layout does not shift.
 * Legacy path: raw `[top]` / `[left]` for map/context menus without a DOM anchor.
 *
 * TODO: CDK Overlay (`FlexibleConnectedPositionStrategy`) when we can attach without DomPortal
 * (e.g. `CdkConnectedOverlay` at callsites or BrnPopover migration).
 * @see docs/specs/component/filters/dropdown-system.md
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
import { computeAnchorPlacementForElement } from './dropdown-anchor-placement';
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
    '[style.position]': '"fixed"',
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

  private resizeObserver: ResizeObserver | null = null;
  private repositionFrame: number | null = null;

  readonly anchor = input<HTMLElement | null>(null);
  readonly placement = input<'start' | 'end'>('start');
  readonly top = input<number>(0);
  readonly left = input<number>(0);
  readonly minWidth = input<number | null>(null);
  readonly maxWidth = input<number | null>(null);
  readonly panelClass = input('');
  readonly outsideCloseEnabled = input(true);

  protected readonly clampedTop = signal(0);
  protected readonly clampedLeft = signal(0);

  protected readonly inlineTop = computed(() => this.clampedTop());
  protected readonly inlineLeft = computed(() => this.clampedLeft());

  readonly closeRequested = output<void>();

  constructor() {
    effect(() => {
      const anchor = this.anchor();
      if (anchor) {
        untracked(() => {
          this.bindResizeObserver(anchor);
          this.scheduleReposition();
        });
        return;
      }

      untracked(() => {
        this.bindResizeObserver(null);
        this.cancelRepositionFrame();
      });

      const desiredTop = this.top();
      const desiredLeft = this.left();
      this.clampedTop.set(desiredTop);
      this.clampedLeft.set(desiredLeft);
      untracked(() => this.scheduleViewportClamp(desiredLeft, desiredTop));
    });

    afterNextRender(() => {
      if (this.anchor()) {
        this.scheduleReposition();
      } else {
        this.scheduleViewportClamp(this.left(), this.top());
      }
    });

    if (typeof window !== 'undefined') {
      const onScrollOrResize = () => {
        if (this.anchor()) {
          this.scheduleReposition();
        }
      };
      document.addEventListener('scroll', onScrollOrResize, { capture: true, passive: true });
      window.addEventListener('resize', onScrollOrResize, { passive: true });
      this.destroyRef.onDestroy(() => {
        document.removeEventListener('scroll', onScrollOrResize, true);
        window.removeEventListener('resize', onScrollOrResize);
        this.bindResizeObserver(null);
        this.cancelRepositionFrame();
      });
    }
  }

  private scheduleReposition(): void {
    if (typeof window === 'undefined') {
      return;
    }
    if (this.repositionFrame != null) {
      return;
    }
    this.repositionFrame = requestAnimationFrame(() => {
      this.repositionFrame = null;
      this.positionFromAnchor();
    });
  }

  private cancelRepositionFrame(): void {
    if (this.repositionFrame != null) {
      cancelAnimationFrame(this.repositionFrame);
      this.repositionFrame = null;
    }
  }

  private bindResizeObserver(anchor: HTMLElement | null): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (!anchor || typeof ResizeObserver === 'undefined') {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => this.scheduleReposition());
    this.resizeObserver.observe(anchor);
    this.resizeObserver.observe(this.host.nativeElement);
  }

  private positionFromAnchor(): void {
    const anchor = this.anchor();
    if (!anchor) {
      return;
    }

    const { top, left } = computeAnchorPlacementForElement(
      anchor,
      this.host.nativeElement,
      this.placement(),
      PLACEMENT_GAP_PX,
      PLACEMENT_MARGIN_PX,
    );
    this.clampedTop.set(top);
    this.clampedLeft.set(left);
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

    if (this.isClickInside(target)) {
      return;
    }

    this.requestClose();
  }

  private isClickInside(target: Node): boolean {
    if (this.host.nativeElement.contains(target)) {
      return true;
    }
    return !!this.anchor()?.contains(target);
  }

  onEscape(): void {
    this.requestClose();
  }
}
