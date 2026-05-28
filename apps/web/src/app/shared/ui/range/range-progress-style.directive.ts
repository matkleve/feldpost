import {
  afterNextRender,
  Directive,
  DoCheck,
  ElementRef,
  HostListener,
  inject,
} from '@angular/core';

/**
 * Syncs `--range-fill-percent` for WebKit range track gradients (see `_range-input-accent.scss`).
 * @see docs/design/state-visuals.md § Interaction emphasis
 */
@Directive({
  selector: 'input[type=range][fpRangeProgress]',
  standalone: true,
})
export class RangeProgressStyleDirective implements DoCheck {
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private lastValue = '';

  constructor() {
    afterNextRender(() => this.syncFillPercent());
  }

  ngDoCheck(): void {
    const value = this.el.nativeElement.value;
    if (value !== this.lastValue) {
      this.lastValue = value;
      this.syncFillPercent();
    }
  }

  @HostListener('input')
  onInput(): void {
    this.syncFillPercent();
  }

  private syncFillPercent(): void {
    const input = this.el.nativeElement;
    this.lastValue = input.value;
    const min = Number(input.min);
    const max = Number(input.max);
    const val = Number(input.value);
    const lo = Number.isFinite(min) ? min : 0;
    const hi = Number.isFinite(max) ? max : 100;
    const v = Number.isFinite(val) ? val : lo;
    const span = hi - lo;
    const pct = span <= 0 ? 0 : ((v - lo) / span) * 100;
    input.style.setProperty('--range-fill-percent', `${pct}%`);
  }
}
