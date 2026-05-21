import {
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { HLM_BUTTON_IMPORTS } from '../../../ui/button';

const INLINE_CONFIRM_REVERT_MS = 5000;

/**
 * Two-step destructive row action: first click arms, second click emits `confirmed`.
 * @see https://blog.boristerzic.com/posts/2023-10-11-delete-resource-ui-pattern/
 */
@Component({
  selector: 'app-detail-row-inline-confirm-action',
  standalone: true,
  imports: [...HLM_BUTTON_IMPORTS],
  templateUrl: './detail-row-inline-confirm-action.component.html',
  styleUrls: [
    './detail-row-inline-confirm-action.component.scss',
    '../_detail-row-slots.scss',
  ],
})
export class DetailRowInlineConfirmActionComponent implements OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  /** Grid slot class suffix, e.g. `r1` → `detail-row-action--r1`. */
  readonly slot = input<'r1' | 'r2'>('r1');
  readonly disabled = input(false);
  /** When false, action stays hidden until row hover (detail-row default). */
  readonly visible = input(true);
  readonly initialAriaKey = input.required<string>();
  readonly initialAriaFallback = input.required<string>();
  readonly initialTitleKey = input<string | null>(null);
  readonly initialTitleFallback = input<string | null>(null);
  readonly confirmAriaKey = input('workspace.imageDetail.action.inlineConfirm.aria');
  readonly confirmAriaFallback = input('Confirm removal');
  readonly confirmTitleKey = input('workspace.imageDetail.action.inlineConfirm.title');
  readonly confirmTitleFallback = input('Click again to confirm');

  readonly confirmed = output<void>();

  readonly armed = signal(false);

  private revertTimer: ReturnType<typeof setTimeout> | null = null;
  private ignoreOutsideUntil = 0;

  ngOnDestroy(): void {
    this.clearRevertTimer();
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.armed() || Date.now() < this.ignoreOutsideUntil) {
      return;
    }
    const target = event.target as Node | null;
    if (!target || this.elementRef.nativeElement.contains(target)) {
      return;
    }
    this.disarm();
  }

  onClick(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled()) {
      return;
    }
    if (!this.armed()) {
      this.arm();
      return;
    }
    this.disarm();
    this.confirmed.emit();
  }

  ariaLabel(): string {
    if (this.armed()) {
      return this.t(this.confirmAriaKey(), this.confirmAriaFallback());
    }
    return this.t(this.initialAriaKey(), this.initialAriaFallback());
  }

  title(): string | null {
    if (this.armed()) {
      return this.t(this.confirmTitleKey(), this.confirmTitleFallback());
    }
    const key = this.initialTitleKey();
    const fallback = this.initialTitleFallback();
    if (key && fallback) {
      return this.t(key, fallback);
    }
    return null;
  }

  private arm(): void {
    this.armed.set(true);
    this.ignoreOutsideUntil = Date.now() + 200;
    this.scheduleRevert();
  }

  private disarm(): void {
    this.armed.set(false);
    this.clearRevertTimer();
  }

  private scheduleRevert(): void {
    this.clearRevertTimer();
    this.revertTimer = setTimeout(() => this.disarm(), INLINE_CONFIRM_REVERT_MS);
  }

  private clearRevertTimer(): void {
    if (this.revertTimer !== null) {
      clearTimeout(this.revertTimer);
      this.revertTimer = null;
    }
  }
}
