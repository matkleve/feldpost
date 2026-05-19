import { Component, inject, input } from '@angular/core';
import type { ToastItem } from '../../core/toast/toast.types';
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
    '[attr.aria-live]': "item().type === 'error' ? 'assertive' : null",
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave()',
    '(animationend)': 'onAnimationEnd()',
  },
})
export class ToastItemComponent {
  private readonly toast = inject(ToastService);

  readonly item = input.required<ToastItem>();

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
