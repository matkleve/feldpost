import { Component, computed, inject, input, signal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { formatToastCodeRef, toastHasExpandableDetail } from '../../core/toast/toast.helpers';
import type { ToastCodeRef, ToastItem } from '../../core/toast/toast.types';
import { ToastService } from '../../core/toast/toast.service';
import { HLM_BUTTON_IMPORTS } from '../ui/button';

@Component({
  selector: 'ss-toast-item',
  standalone: true,
  imports: [...HLM_BUTTON_IMPORTS],
  templateUrl: './toast-item.component.html',
  styleUrl: './toast-item.component.scss',
  host: {
    '[class]': 'item().type',
    '[class.entering]': "item().state === 'entering'",
    '[class.visible]': "item().state === 'visible'",
    '[class.exiting]': "item().state === 'exiting'",
    '[class.expanded]': 'expanded()',
    '[attr.aria-live]': "item().type === 'error' ? 'assertive' : null",
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave()',
    '(animationend)': 'onAnimationEnd()',
  },
})
export class ToastItemComponent {
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);

  readonly item = input.required<ToastItem>();
  readonly expanded = signal(false);

  readonly expandLabel = computed(() =>
    this.expanded()
      ? this.i18n.t('toast.hideDetails', 'Hide details')
      : this.i18n.t('toast.showDetails', 'Show details'),
  );

  readonly showExpandControl = computed(() =>
    toastHasExpandableDetail({ body: this.item().body, detail: this.item().detail }),
  );

  formatCodeRef(ref: ToastCodeRef): string {
    return formatToastCodeRef(ref);
  }

  toggleExpanded(): void {
    this.expanded.update((value) => !value);
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

  onAction(): void {
    const action = this.item().action;
    if (!action) return;
    action.onClick();
    this.toast.dismiss(this.item().id);
  }
}
