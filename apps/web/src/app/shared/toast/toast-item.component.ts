import { Component, computed, inject, input } from '@angular/core';
import type { ToastItem, ToastType } from '../../core/toast/toast.types';
import { ToastService } from '../../core/toast/toast.service';
import { HlmToastDirective, type ToastVariants } from '../ui/toast';

function toastTypeToVariant(type: ToastType): NonNullable<ToastVariants['variant']> {
  if (type === 'success' || type === 'error' || type === 'warning') {
    return type;
  }
  return 'default';
}

const ICON_MAP: Record<string, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

@Component({
  selector: 'ss-toast-item',
  standalone: true,
  imports: [HlmToastDirective],
  templateUrl: './toast-item.component.html',
  styleUrl: './toast-item.component.scss',
  host: {
    '[class]': 'item().type',
    '[class.entering]': "item().state === 'entering'",
    '[class.visible]': "item().state === 'visible'",
    '[class.exiting]': "item().state === 'exiting'",
    '[attr.aria-live]': "item().type === 'error' ? 'assertive' : null",
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave()',
    '(animationend)': 'onAnimationEnd()',
  },
})
export class ToastItemComponent {
  private readonly toast = inject(ToastService);

  readonly item = input.required<ToastItem>();

  /** Maps `ToastType` to CVA variant (`info` → `default`). */
  protected readonly toastVariant = computed(() => toastTypeToVariant(this.item().type));

  get icon(): string {
    return ICON_MAP[this.item().type] ?? 'info';
  }

  onMouseEnter(): void {
    this.toast.pause(this.item().id);
  }

  onMouseLeave(): void {
    this.toast.resume(this.item().id);
  }

  onAnimationEnd(): void {
    const current = this.item();
    if (current.state === 'entering') {
      this.toast.markVisible(current.id);
    } else if (current.state === 'exiting') {
      this.toast.afterExit(current.id);
    }
  }

  onDismiss(): void {
    this.toast.dismiss(this.item().id);
  }
}
