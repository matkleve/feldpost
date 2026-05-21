import {
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
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
    '../_detail-row-slots.scss',
    './detail-row-inline-confirm-action.component.scss',
  ],
})
export class DetailRowInlineConfirmActionComponent implements OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  /** `r1` when sole right action; `r2` only when `r1` is taken (e.g. resolve). Matches check/cancel in edit mode. */
  readonly slot = input<'r1' | 'r2'>('r1');
  readonly disabled = input(false);
  /** When false, nothing to clear/remove — control is not rendered. */
  readonly enabled = input(true);
  readonly initialAriaKey = input.required<string>();
  readonly initialAriaFallback = input.required<string>();
  readonly initialTitleKey = input<string | null>(null);
  readonly initialTitleFallback = input<string | null>(null);
  readonly confirmAriaKey = input('workspace.imageDetail.action.inlineConfirm.aria');
  readonly confirmAriaFallback = input('Confirm removal');
  readonly confirmTitleKey = input('workspace.imageDetail.action.inlineConfirm.title');
  readonly confirmTitleFallback = input('Click again to confirm');
  /** Idle icon (Material ligature name). Default `close` for clear/remove. */
  readonly idleIcon = input('close');
  /** Armed icon before second click confirms. Default `delete`. */
  readonly armedIcon = input('delete');

  readonly confirmed = output<void>();

  readonly armed = signal(false);

  private readonly actionButton = viewChild<ElementRef<HTMLButtonElement>>('actionButton');

  private revertTimer: ReturnType<typeof setTimeout> | null = null;
  private ignoreOutsideUntil = 0;

  ngOnDestroy(): void {
    this.clearRevertTimer();
  }

  /** Outside dismiss runs on click (after this button's click handler), not pointerdown. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.armed() || Date.now() < this.ignoreOutsideUntil) {
      return;
    }
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    const button = this.actionButton()?.nativeElement;
    if (button?.contains(target)) {
      return;
    }
    if (this.elementRef.nativeElement.contains(target)) {
      return;
    }
    this.disarm();
  }

  onActionPointerDown(event: PointerEvent): void {
    event.stopPropagation();
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
